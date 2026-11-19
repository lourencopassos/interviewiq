import type { Session } from "@interviewiq/db";
import type { AnswerEvaluation, CoachingReport, InterviewEvent, InterviewStage } from "@interviewiq/types";
import { AppError, toAppError } from "../errors";
import { ttsCache } from "../cache/tts-cache";
import { sseEmitter } from "../sse/emitter";
import { AudioPipeline } from "../services/audio-pipeline";
import { AdaptiveEngine } from "../services/adaptive-engine";
import type { ICECandidateInit, SDPDescriptionInit } from "../services/avatar-stream";
import { evaluateAnswer } from "../prompts/answer-evaluator";
import { generateStageTransition } from "../prompts/stage-narrator";
import { fallbacksFor } from "../i18n/fallbacks";
import { AvatarRelay } from "./avatar-relay";
import { events } from "./events";
import { buildPromptContext, type PromptContext } from "./prompt-context";
import { planQuestions } from "./question-planner";
import { QuestionRepository, type RuntimeQuestion } from "./question-repository";
import { buildAndSaveReport, hasReport } from "./report-builder";
import { SessionRepository } from "./session-repository";

export type StartOutcome = "started" | "pending" | "resumed";

export interface OrchestratorHooks {
  /** Called when this instance should be dropped from the registry (finished or failed to start). */
  onRetire?: (orchestrator: InterviewOrchestrator) => void;
}

/** Stage score used when a stage ends without a single scored answer. */
const NEUTRAL_STAGE_SCORE = 50;

/** Mean score of a stage's answered questions, rounded. */
function stageScore(questions: RuntimeQuestion[], stage: InterviewStage): number {
  const scores = questions.flatMap((q) => (q.stage === stage && q.score !== null ? [q.score] : []));
  if (scores.length === 0) return NEUTRAL_STAGE_SCORE;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

/**
 * The interview state machine for one session:
 *
 *   SETUP → BRIEFING → INTERVIEWING → WRAPPING_UP → COMPLETED
 *
 * It holds no interview state of its own. Every request reloads the session
 * and question list from Postgres; in-process state is limited to the start,
 * answer and report locks and the video stream. Cross-process safety comes
 * from the conditional status transitions in `SessionRepository`.
 */
export class InterviewOrchestrator {
  private readonly sessions: SessionRepository;
  private readonly avatar: AvatarRelay;
  private readonly audio = new AudioPipeline();
  private readonly adaptive = new AdaptiveEngine();

  // In-process locks. Each is taken synchronously, before any await.
  private startPromise: Promise<StartOutcome> | null = null;
  private answerPromise: Promise<void> | null = null;
  private reportPromise: Promise<CoachingReport> | null = null;

  constructor(
    private readonly sessionId: string,
    private readonly hooks: OrchestratorHooks = {},
  ) {
    this.sessions = new SessionRepository(sessionId);
    this.avatar = new AvatarRelay(sessionId, (event) => this.emit(event));
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  /**
   * Start the interview. Idempotent: concurrent calls share one promise, and
   * SETUP → BRIEFING is claimed atomically so no other process can generate a
   * second question set. Resolves "started", "pending" (another start is in
   * progress) or "resumed" (already past setup; the stream replays state).
   */
  async startInterview(): Promise<StartOutcome> {
    if (this.startPromise) {
      await this.startPromise;
      return "pending";
    }
    this.startPromise = this.claimAndStart();
    try {
      return await this.startPromise;
    } catch (error) {
      // A retry should get a fresh instance (and the current code after a dev reload).
      this.hooks.onRetire?.(this);
      throw error;
    } finally {
      this.startPromise = null;
    }
  }

  private async claimAndStart(): Promise<StartOutcome> {
    if (!(await this.sessions.transition("SETUP", "BRIEFING"))) {
      const session = await this.sessions.load();
      if (session.status !== "BRIEFING") return "resumed";
      // BRIEFING with no start running in this process means a previous attempt
      // died mid-way (see ARCHITECTURE.md). Reclaim it so the user isn't stuck.
      if (!(await this.sessions.transition("BRIEFING", "BRIEFING"))) return "pending";
    }
    await this.runStart();
    return "started";
  }

  private async runStart(): Promise<void> {
    const session = await this.sessions.load();
    const questionRepo = this.questionsFor(session);
    let committed = false;

    try {
      await questionRepo.clear();
      const plan = await planQuestions(buildPromptContext(session));
      await questionRepo.insertAll(plan.questions);

      const questions = await questionRepo.load();
      if (questions.length === 0) throw new AppError("EMPTY_QUESTION_SET");

      await this.sessions.commitInterview(plan.opening, plan.closing);
      committed = true;
      this.emit(events.stateChange("INTERVIEWING"));
      this.announceStage(session, questions[0]);
      await this.presentQuestion(session, questions, 0, { prefixText: plan.opening });
    } catch (error) {
      if (committed) {
        // Questions exist and the session is INTERVIEWING; a reconnect replays
        // the current question, so the generated set is kept.
        console.error("Start failed after the interview was committed:", error);
        return;
      }
      await this.rollbackStart(error);
    }
  }

  /** Undo a start that failed before commit, tell the client, and rethrow. */
  private async rollbackStart(error: unknown): Promise<never> {
    await this.sessions.transition("BRIEFING", "SETUP").catch(() => undefined);
    await this.avatar.destroy();
    const appError = toAppError(error, "START_FAILED");
    this.emit(events.error(appError));
    throw appError;
  }

  // ---------------------------------------------------------------------------
  // Resume
  // ---------------------------------------------------------------------------

  /**
   * Replay the current state to a (re)connected client, so nothing emitted
   * while it was disconnected is lost. Called by the SSE route right after the
   * connection registers.
   */
  async resume(): Promise<void> {
    const session = await this.sessions.load();
    switch (session.status) {
      case "INTERVIEWING":
        return this.replayCurrentQuestion(session);
      case "WRAPPING_UP":
        return this.replayWrapUp();
      case "COMPLETED":
        return this.emitCompleted();
      default:
        this.emit(events.stateChange(session.status));
    }
  }

  private async replayCurrentQuestion(session: Session): Promise<void> {
    const questions = await this.questionsFor(session).load();
    this.emit(events.stateChange("INTERVIEWING"));
    this.announceStage(session, questions[session.currentIndex]);
    await this.presentQuestion(session, questions, session.currentIndex, { persistIndex: false });
  }

  /** WRAPPING_UP with a report means the final write was interrupted; without one, generation died. */
  private async replayWrapUp(): Promise<void> {
    this.emit(events.stateChange("WRAPPING_UP"));
    if (await hasReport(this.sessionId)) {
      await this.sessions.markCompleted();
      this.emitCompleted();
      return;
    }
    // Restart generation in the background; the report page polls until it lands.
    if (!this.reportPromise) void this.generateReport().catch(() => undefined);
    this.emit(events.complete(this.sessionId));
  }

  // ---------------------------------------------------------------------------
  // Answer pipeline
  // ---------------------------------------------------------------------------

  /** Transcribe, score and persist an answer, then present whatever comes next. One at a time. */
  async handleAnswer(audioBuffer: Buffer, mimeType = "audio/webm"): Promise<void> {
    if (this.answerPromise) throw new AppError("ANSWER_IN_FLIGHT");
    this.answerPromise = this.processAnswer(audioBuffer, mimeType).finally(() => {
      this.answerPromise = null;
    });
    await this.answerPromise;
  }

  private async processAnswer(audioBuffer: Buffer, mimeType: string): Promise<void> {
    const session = await this.sessions.load();
    if (session.status !== "INTERVIEWING") {
      throw new AppError("NOT_INTERVIEWING", { details: `session is ${session.status}` });
    }

    const questionRepo = this.questionsFor(session);
    const questions = await questionRepo.load();
    const index = session.currentIndex;
    const current = questions[index];
    if (!current) {
      const error = new AppError("NO_QUESTION", { details: `no question at index ${index}` });
      this.emit(events.error(error));
      throw error;
    }

    if (current.transcript !== null) {
      // Double submit, or a retry after a partial failure: don't re-score, replay.
      console.warn(`Answer for question ${current.id} already recorded; replaying state`);
      await this.presentQuestion(session, questions, index, { persistIndex: false });
      return;
    }

    const transcript = await this.audio.transcribe(audioBuffer, session.language, mimeType);
    this.emit(events.transcription(current.id, transcript));

    const context = buildPromptContext(session);
    const evaluation = await evaluateAnswer({
      ...context,
      questionText: current.text,
      targetSkill: current.targetSkill,
      scoringGuide: current.scoringGuide,
      transcript,
    });
    this.emit(events.evaluation(current.id, evaluation));

    await questionRepo.recordAnswer(current.id, transcript, evaluation);
    current.score = evaluation.score;
    current.transcript = transcript;

    await this.advance(session, context, questionRepo, questions, index, evaluation);
  }

  /** Apply the adaptive engine's decision for the answer at `index`. */
  private async advance(
    session: Session,
    context: PromptContext,
    questionRepo: QuestionRepository,
    questions: RuntimeQuestion[],
    index: number,
    evaluation: AnswerEvaluation,
  ): Promise<void> {
    const current = questions[index];
    const feedback = evaluation.shortFeedback;
    const next = this.adaptive.selectNext(questions, evaluation, index);

    if (next.kind === "complete") return this.finishInterview(session, current, feedback);

    if (next.kind === "followUp") {
      const displaced = questions[index + 1];
      if (displaced) ttsCache.invalidate(displaced.id);
      await questionRepo.insertFollowUp(current, next.text);
      this.emit(events.transitionText(feedback));
      return this.presentQuestion(session, await questionRepo.load(), index + 1);
    }

    const nextStage = questions[next.index].stage;
    if (session.interviewType === "FULL_LOOP" && current.stage && nextStage && nextStage !== current.stage) {
      return this.transitionStage(session, context, questions, current.stage, next.index, nextStage);
    }

    this.emit(events.transitionText(feedback));
    await this.presentQuestion(session, questions, next.index);
  }

  /** Full Loop: narrate the stage boundary, then present the first question of the next stage. */
  private async transitionStage(
    session: Session,
    context: PromptContext,
    questions: RuntimeQuestion[],
    completedStage: InterviewStage,
    nextIndex: number,
    nextStage: InterviewStage,
  ): Promise<void> {
    const score = stageScore(questions, completedStage);
    const narration = await generateStageTransition({
      ...context,
      completedStage,
      completedStageScore: score,
      nextStage,
    });
    const audioUrl = await ttsCache.getOrGenerate(this.sessionId, narration, session.language);

    this.emit(events.stageTransition(completedStage, score, nextStage, audioUrl));
    await this.avatar.say(narration);
    await this.presentQuestion(session, questions, nextIndex);
  }

  /** Speak the closing, move to WRAPPING_UP and generate the report. */
  private async finishInterview(session: Session, lastQuestion: RuntimeQuestion, feedback: string): Promise<void> {
    const closing = session.closing || fallbacksFor(session.language).closing;
    const spokenText = `${feedback} ${closing}`;

    await this.sessions.markWrappingUp();
    this.emit(events.stateChange("WRAPPING_UP"));
    this.emit(events.transitionText(closing));

    try {
      const audioUrl = await ttsCache.getOrGenerate(this.sessionId, spokenText, session.language);
      this.emitAudioReady(lastQuestion.id, audioUrl, spokenText);
    } catch (error) {
      console.warn("Closing TTS failed, continuing to report:", error);
    }

    // A report failure is surfaced over SSE; the answer itself succeeded.
    await this.generateReport().catch(() => undefined);
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  /**
   * Generate (or regenerate) the coaching report. Concurrent calls share one
   * promise. On failure the session stays WRAPPING_UP and a REPORT_FAILED
   * event is emitted; the original error is rethrown for the caller.
   */
  async generateReport(): Promise<CoachingReport> {
    if (this.reportPromise) return this.reportPromise;
    this.reportPromise = this.runGenerateReport().finally(() => {
      this.reportPromise = null;
    });
    return this.reportPromise;
  }

  private async runGenerateReport(): Promise<CoachingReport> {
    try {
      const session = await this.sessions.load();
      const questions = await this.questionsFor(session).load();
      const report = await buildAndSaveReport(this.sessionId, buildPromptContext(session), questions, this.sessions);
      this.emitCompleted();
      await this.teardownRuntime();
      return report;
    } catch (error) {
      console.error("Report generation failed:", error);
      this.emit(events.error(new AppError("REPORT_FAILED", { cause: error })));
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Video (D-ID) relay
  // ---------------------------------------------------------------------------

  /** Mint a fresh avatar offer (delivered over SSE). Returns false for non-video sessions. */
  async requestAvatarOffer(): Promise<boolean> {
    return this.avatar.requestOffer(await this.sessions.load());
  }

  /** Lip-sync the line whose audio just started playing. Returns false when there is no stream. */
  async speakCurrent(): Promise<boolean> {
    return this.avatar.speakCurrent(() => this.sessions.load());
  }

  async handleSdpAnswer(sdpAnswer: SDPDescriptionInit): Promise<boolean> {
    return this.avatar.relaySdp(sdpAnswer);
  }

  async handleIceCandidate(candidate: ICECandidateInit): Promise<boolean> {
    return this.avatar.relayIce(candidate);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Hard teardown (session deleted or abandoned): also drops cached audio. */
  async destroy(): Promise<void> {
    await this.teardownRuntime();
    ttsCache.clearSession(this.sessionId);
  }

  /** Release external resources once the interview is over. Audio blobs expire via TTL. */
  private async teardownRuntime(): Promise<void> {
    await this.avatar.destroy();
    this.hooks.onRetire?.(this);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private emit(event: InterviewEvent): void {
    sseEmitter.emit(this.sessionId, event);
  }

  private emitCompleted(): void {
    this.emit(events.stateChange("COMPLETED"));
    this.emit(events.complete(this.sessionId));
  }

  private questionsFor(session: Session): QuestionRepository {
    return new QuestionRepository(this.sessionId, session.language);
  }

  /** Full Loop: tell the client which stage the current question belongs to. */
  private announceStage(session: Session, question: RuntimeQuestion | undefined): void {
    if (session.interviewType === "FULL_LOOP" && question?.stage) {
      this.emit(events.stageIntro(question.stage));
    }
  }

  /**
   * Emit audio_ready and remember the spoken text. The D-ID talk itself is
   * triggered by the client (POST /avatar-speak) when playback starts, so lips
   * and voice line up and nothing is spoken into a half-open connection.
   */
  private emitAudioReady(questionId: string, audioUrl: string, spokenText: string): void {
    this.emit(events.audioReady(questionId, audioUrl));
    this.avatar.remember(questionId, spokenText);
  }

  /**
   * Make question `index` current: persist the position, emit question_ready,
   * speak it (consuming the prefetched clip when possible) and prefetch the
   * next one. TTS failure is not fatal; the client shows the written question.
   */
  private async presentQuestion(
    session: Session,
    questions: RuntimeQuestion[],
    index: number,
    options: { prefixText?: string; persistIndex?: boolean } = {},
  ): Promise<void> {
    const question = questions[index];
    if (!question) throw new AppError("NO_QUESTION", { details: `no question at index ${index}` });

    const spokenText = options.prefixText ? `${options.prefixText} ${question.text}` : question.text;

    // Commit the position first so a retry after an audio failure lands on
    // this question instead of re-processing the previous one.
    if (options.persistIndex !== false) await this.sessions.setCurrentIndex(index);

    this.emit(events.questionReady(question, index, questions.length));

    try {
      // Only the plain question text can use the prefetched clip.
      const prefetchedId = options.prefixText ? undefined : question.id;
      const audioUrl = await ttsCache.getOrGenerate(this.sessionId, spokenText, session.language, prefetchedId);
      this.emitAudioReady(question.id, audioUrl, spokenText);
    } catch (error) {
      console.warn(`TTS failed for question ${question.id}:`, error);
      this.emit(events.error(new AppError("AUDIO_UNAVAILABLE", { cause: error })));
    }

    ttsCache.prefetch(this.sessionId, questions[index + 1], session.language);
  }
}
