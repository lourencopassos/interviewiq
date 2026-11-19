import { prisma } from "@interviewiq/db";
import {
  FULL_LOOP_STAGES,
  parsedJobSchema,
  companyIntelligenceSchema,
  type GeneratedQuestion,
  type ParsedJob,
  type CompanyIntelligence,
  type CoachingReport,
  type Difficulty,
  type InterviewType,
  type Language,
  type InterviewEvent,
  type InterviewStage,
  type AvatarFailureCode,
} from "@interviewiq/types";
import { AudioPipeline } from "./audio-pipeline";
import { AdaptiveEngine, type AdaptiveQuestion } from "./adaptive-engine";
import { ttsCache } from "../cache/tts-cache";
import { AvatarStream, AvatarStreamError } from "./avatar-stream";
import { isMockMode } from "../mock";
import { MissingApiKeyError } from "../errors";
import { sseEmitter } from "../sse/emitter";
import { generateQuestionSet } from "../prompts/question-generator";
import { evaluateAnswer } from "../prompts/answer-evaluator";
import { generateCoachingReport } from "../prompts/report-generator";
import { generateStageTransition } from "../prompts/stage-narrator";
import { isString, parseJsonArray } from "../utils/json";

declare global {
  // eslint-disable-next-line no-var
  var __orchestrators: Map<string, InterviewOrchestrator> | undefined;
}

const orchestrators: Map<string, InterviewOrchestrator> =
  globalThis.__orchestrators ?? new Map();
globalThis.__orchestrators = orchestrators;

/** Error with an HTTP status hint so routes stay thin. */
export class OrchestratorError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus = 400,
  ) {
    super(message);
    this.name = "OrchestratorError";
  }
}

/** Fixed client copy for `avatar_stream_failed`; provider detail stays in the server log. */
const AVATAR_FAILURE_REASON: Record<AvatarFailureCode, string> = {
  AVATAR_UNAVAILABLE: "The video interviewer is unavailable. Continuing with audio.",
  AVATAR_QUOTA: "The video service is at its concurrent stream limit. Continuing with audio.",
  AVATAR_NO_CREDITS: "The video service account has no credits left. Continuing with audio.",
};

function avatarFailure(error: unknown): { code: AvatarFailureCode; reason: string } {
  const code = error instanceof AvatarStreamError ? error.code : "AVATAR_UNAVAILABLE";
  return { code, reason: AVATAR_FAILURE_REASON[code] };
}

/** Shape we persist in Question.metadata (a GeneratedQuestion plus runtime flags). */
interface QuestionMeta extends Partial<GeneratedQuestion> {
  isFollowUp?: boolean;
  parentQuestionId?: string;
}

/** A question as loaded from the DB — the single source of truth during an interview. */
interface RuntimeQuestion extends AdaptiveQuestion {
  order: number;
  text: string;
  category: string;
  targetSkill: string;
  scoringGuide: { poor: string; good: string; excellent: string };
  score: number | null;
  transcript: string | null;
  strengths: string[];
  gaps: string[];
}

type SessionRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.session.findUnique>>
>;

const DEFAULT_SCORING_GUIDE = {
  poor: "Weak answer",
  good: "Solid answer",
  excellent: "Outstanding answer",
};

function parseMeta(raw: string | null): QuestionMeta {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function toRuntime(q: {
  id: string;
  order: number;
  text: string;
  category: string;
  stage: string | null;
  metadata: string | null;
  score: number | null;
  transcript: string | null;
  strengths: string | null;
  gaps: string | null;
}): RuntimeQuestion {
  const meta = parseMeta(q.metadata);
  return {
    id: q.id,
    order: q.order,
    text: q.text,
    category: q.category,
    stage: q.stage,
    difficulty: typeof meta.difficulty === "number" ? meta.difficulty : 3,
    targetSkill: meta.targetSkill || "general",
    scoringGuide: meta.scoringGuide || DEFAULT_SCORING_GUIDE,
    isFollowUp: meta.isFollowUp === true,
    score: q.score,
    transcript: q.transcript,
    strengths: parseJsonArray(q.strengths, isString),
    gaps: parseJsonArray(q.gaps, isString),
  };
}

function stageLabel(stage: string | null): string {
  return FULL_LOOP_STAGES.find((s) => s.stage === stage)?.label ?? stage ?? "";
}

export class InterviewOrchestrator {
  private sessionId: string;
  private audioPipeline: AudioPipeline;
  private adaptiveEngine: AdaptiveEngine;
  private avatarStream: AvatarStream | null = null;

  // In-process locks. Cross-process safety comes from atomic DB status transitions.
  private startPromise: Promise<"started" | "pending" | "resumed"> | null = null;
  private answerPromise: Promise<void> | null = null;
  private reportPromise: Promise<CoachingReport> | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.audioPipeline = new AudioPipeline();
    this.adaptiveEngine = new AdaptiveEngine();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private emit(event: InterviewEvent): void {
    sseEmitter.emit(this.sessionId, event);
  }

  private async loadSession(): Promise<SessionRecord> {
    const session = await prisma.session.findUnique({ where: { id: this.sessionId } });
    if (!session) {
      throw new OrchestratorError("SESSION_NOT_FOUND", "Session not found", 404);
    }
    return session;
  }

  /** Always read the question list from the DB so any process sees the same order. */
  private async loadQuestions(): Promise<RuntimeQuestion[]> {
    const rows = await prisma.question.findMany({
      where: { sessionId: this.sessionId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        text: true,
        category: true,
        stage: true,
        metadata: true,
        score: true,
        transcript: true,
        strengths: true,
        gaps: true,
      },
    });
    return rows.map(toRuntime);
  }

  private parseJobContext(session: SessionRecord): {
    parsedJob: ParsedJob;
    companyIntel: CompanyIntelligence | null;
  } {
    let rawJob: unknown = {};
    try {
      rawJob = JSON.parse(session.parsedJob || "{}");
    } catch {
      rawJob = {};
    }
    const jobResult = parsedJobSchema.safeParse(rawJob);
    const parsedJob: ParsedJob = jobResult.success
      ? jobResult.data
      : {
          jobTitle: session.jobTitle,
          companyName: session.companyName,
          seniority: "mid",
          primarySkills: [],
          secondarySkills: [],
          domain: "unknown",
          keyResponsibilities: [],
          inferredStack: [],
          interviewFocus: [],
          companySummary: "",
        };

    let companyIntel: CompanyIntelligence | null = null;
    if (session.companyIntel) {
      try {
        const intelResult = companyIntelligenceSchema.safeParse(
          JSON.parse(session.companyIntel),
        );
        if (intelResult.success) companyIntel = intelResult.data;
      } catch {
        companyIntel = null;
      }
    }

    return { parsedJob, companyIntel };
  }

  /** What the avatar should lip-sync the next time the client starts playback. */
  private lastSpoken: { questionId: string; text: string } | null = null;

  /**
   * Emit audio_ready and remember the spoken text. The D-ID talk itself is
   * triggered by the client (POST /avatar-speak) when the audio actually starts,
   * so lips and voice line up and nothing is spoken into a half-open connection.
   */
  private async emitAudioAndStream(
    questionId: string,
    audioUrl: string,
    spokenText: string | null,
  ): Promise<void> {
    this.emit({ type: "audio_ready", data: { questionId, audioUrl } });
    if (spokenText) this.lastSpoken = { questionId, text: spokenText };
  }

  /**
   * Mint a new D-ID stream and emit its offer. Called by the browser when it
   * needs a peer connection (first load, reload, or after a failure), so the
   * account's concurrent-stream quota is only spent on connections that will
   * actually be negotiated. Returns false for non-video sessions.
   */
  async requestAvatarOffer(): Promise<boolean> {
    const session = await this.loadSession();
    if (!session.videoMode) return false;
    if (session.status !== "INTERVIEWING" && session.status !== "BRIEFING" && session.status !== "SETUP") {
      return false;
    }
    await this.setupAvatar(session);
    return this.avatarStream?.isActive ?? false;
  }

  /** Make the avatar say the current line. Returns false when there is no video stream. */
  async speakCurrent(): Promise<boolean> {
    if (!this.avatarStream?.isActive || !this.lastSpoken) return false;
    const { questionId, text } = this.lastSpoken;
    // A stream minted while mock mode was on must not serve a real request (and
    // vice versa): mint a matching one. The text queues until its handshake.
    if (this.avatarStream.mock !== isMockMode()) {
      await this.setupAvatar(await this.loadSession());
      if (!this.avatarStream?.isActive) return false;
    }
    try {
      await this.avatarStream.sendText(text);
      this.emit({ type: "avatar_stream_audio", data: { questionId } });
      return true;
    } catch (error) {
      console.warn(`Avatar stream text failed for ${questionId}:`, error);
      this.emit({ type: "avatar_stream_failed", data: avatarFailure(error) });
      return false;
    }
  }

  /**
   * Move the session to question `index`, generate (or consume prefetched) audio,
   * emit question_ready + audio_ready, and prefetch the one after it.
   */
  private async presentQuestion(
    session: SessionRecord,
    questions: RuntimeQuestion[],
    index: number,
    options: { prefixText?: string; persistIndex?: boolean } = {},
  ): Promise<void> {
    const question = questions[index];
    if (!question) {
      throw new OrchestratorError("NO_QUESTION", `No question at index ${index}`, 500);
    }

    const spokenText = options.prefixText
      ? `${options.prefixText} ${question.text}`
      : question.text;

    // Commit the position first so a retry after an audio failure lands on
    // this question instead of re-processing the previous one.
    if (options.persistIndex !== false) {
      await prisma.session.update({
        where: { id: this.sessionId, status: "INTERVIEWING" },
        data: { currentIndex: index },
      });
    }

    this.emit({
      type: "question_ready",
      data: {
        questionId: question.id,
        text: question.text,
        category: question.category,
        order: index + 1,
        total: questions.length,
        isFollowUp: question.isFollowUp,
      },
    });

    try {
      // Only consume the prefetched entry when we're speaking the plain question text.
      const audioUrl = await ttsCache.getOrGenerate(
        this.sessionId,
        spokenText,
        session.language,
        options.prefixText ? undefined : question.id,
      );
      await this.emitAudioAndStream(question.id, audioUrl, spokenText);
    } catch (error) {
      // Audio is a nicety; the interview continues with the written question.
      console.warn(`TTS failed for question ${question.id}:`, error);
      this.emit({
        type: "error",
        data: {
          code: "AUDIO_UNAVAILABLE",
          message: "Audio couldn't be generated for this question. Please read it and record your answer.",
          retryable: false,
        },
      });
    }

    ttsCache.prefetch(this.sessionId, questions[index + 1], session.language);
  }

  /**
   * Create a D-ID stream and send its WebRTC offer to the client. An offer is
   * single-use, so any previous stream is torn down first; call this whenever a
   * client (re)connects and needs a fresh peer connection.
   */
  private async setupAvatar(session: SessionRecord): Promise<void> {
    if (!session.videoMode) return;
    try {
      if (this.avatarStream) {
        await this.avatarStream.destroy().catch(() => undefined);
        this.avatarStream = null;
      }
      this.avatarStream = new AvatarStream(session.language);
      const streamSession = await this.avatarStream.createStream(
        session.avatarImageUrl ?? undefined,
      );
      this.emit({
        type: "avatar_stream_ready",
        data: {
          sessionId: this.sessionId,
          streamId: streamSession.id,
          sdpOffer: streamSession.offer,
          iceServers: streamSession.iceServers,
          presenterUrl: streamSession.presenterUrl,
        },
      });
    } catch (error) {
      console.warn("Avatar stream creation failed, falling back to audio-only:", error);
      this.avatarStream = null;
      this.emit({ type: "avatar_stream_failed", data: avatarFailure(error) });
    }
  }

  // ---------------------------------------------------------------------------
  // Start / resume
  // ---------------------------------------------------------------------------

  /**
   * Start the interview. Idempotent: concurrent calls share one promise, and
   * the SETUP → BRIEFING transition is claimed atomically in the DB so a second
   * process cannot generate a second question set.
   *
   * Returns "started" | "pending" (another start is in progress) | "resumed".
   */
  async startInterview(): Promise<"started" | "pending" | "resumed"> {
    if (this.startPromise) {
      await this.startPromise;
      return "pending";
    }

    // Take the in-process lock synchronously, before any await, so two calls
    // in the same tick cannot both pass the check above.
    this.startPromise = this.claimAndStart();
    try {
      return await this.startPromise;
    } catch (error) {
      // A retry should pick up the current implementation after a dev reload.
      if (orchestrators.get(this.sessionId) === this) orchestrators.delete(this.sessionId);
      throw error;
    } finally {
      this.startPromise = null;
    }
  }

  private async claimAndStart(): Promise<"started" | "pending" | "resumed"> {
    let claimed = await prisma.session.updateMany({
      where: { id: this.sessionId, status: "SETUP" },
      data: { status: "BRIEFING" },
    });

    if (claimed.count === 0) {
      const session = await this.loadSession();
      if (session.status !== "BRIEFING") {
        // Already past setup — the SSE stream replays state on connect.
        return "resumed";
      }
      // BRIEFING with no generation running in this process means a previous
      // attempt crashed mid-way (or another process is generating — see FIXES.md D1).
      // Reclaim it so the user isn't stuck.
      claimed = await prisma.session.updateMany({
        where: { id: this.sessionId, status: "BRIEFING" },
        data: { status: "BRIEFING" },
      });
      if (claimed.count === 0) return "pending";
    }

    await this.runStart();
    return "started";
  }

  private async runStart(): Promise<void> {
    const session = await this.loadSession();
    let committed = false;

    try {
      // Clear any leftovers from a previously failed attempt.
      await prisma.question.deleteMany({ where: { sessionId: this.sessionId } });


      const { parsedJob, companyIntel } = this.parseJobContext(session);
      const isFullLoop = session.interviewType === "FULL_LOOP";

      const { opening, closing } = isFullLoop
        ? await this.generateFullLoopQuestions(session, parsedJob, companyIntel)
        : await this.generateStandardQuestions(session, parsedJob, companyIntel);

      const questions = await this.loadQuestions();
      if (questions.length === 0) {
        throw new OrchestratorError(
          "EMPTY_QUESTION_SET",
          "The interviewer could not generate questions for this role. Please try again.",
          502,
        );
      }

      await prisma.session.update({
        where: { id: this.sessionId, status: "BRIEFING" },
        data: { status: "INTERVIEWING", currentIndex: 0, opening, closing },
      });
      committed = true;
      this.emit({ type: "state_change", data: { status: "INTERVIEWING" } });

      if (isFullLoop) {
        this.emit({
          type: "stage_transition",
          data: {
            completedStage: "",
            stageScore: 0,
            nextStage: stageLabel(questions[0].stage),
            transitionAudioUrl: "",
          },
        });
      }

      await this.presentQuestion(session, questions, 0, { prefixText: opening });
    } catch (error) {
      if (committed) {
        // Questions exist and the session is INTERVIEWING; a reconnect replays
        // the current question, so don't throw the generated set away.
        console.error("Start failed after the interview was committed:", error);
        return;
      }
      // Roll back so the user can retry instead of being stuck in BRIEFING.
      await prisma.session
        .updateMany({ where: { id: this.sessionId, status: "BRIEFING" }, data: { status: "SETUP" } })
        .catch(() => undefined);
      await this.avatarStream?.destroy().catch(() => undefined);
      this.avatarStream = null;

      // The start route logs the full error. OrchestratorError messages are our own fixed copy; anything else
      // (provider bodies, stack details) stays in the server log.
      this.emit({
        type: "error",
        data:
          error instanceof OrchestratorError
            ? { code: error.code, message: error.message, retryable: true }
            : error instanceof MissingApiKeyError
              ? { code: error.code, message: error.message, retryable: false }
              : { code: "START_FAILED", message: "Failed to start the interview. Please try again.", retryable: true },
      });
      throw error;
    }
  }

  private async generateStandardQuestions(
    session: SessionRecord,
    parsedJob: ParsedJob,
    companyIntel: CompanyIntelligence | null,
  ): Promise<{ opening: string; closing: string }> {
    const questionSet = await generateQuestionSet({
      companyName: session.companyName,
      jobTitle: session.jobTitle,
      difficulty: session.difficulty as Difficulty,
      interviewType: session.interviewType as InterviewType,
      parsedJob,
      companyIntel,
      resumeText: session.resumeText,
      language: session.language as Language,
    });

    await prisma.question.createMany({
      data: questionSet.questions.map((q, i) => ({
        sessionId: this.sessionId,
        order: i,
        text: q.text,
        category: q.category,
        metadata: JSON.stringify(q),
      })),
    });

    return { opening: questionSet.opening, closing: questionSet.closing };
  }

  private async generateFullLoopQuestions(
    session: SessionRecord,
    parsedJob: ParsedJob,
    companyIntel: CompanyIntelligence | null,
  ): Promise<{ opening: string; closing: string }> {
    const stageResults = await Promise.all(
      FULL_LOOP_STAGES.map((stageConfig, index) =>
        generateQuestionSet({
          companyName: session.companyName,
          jobTitle: session.jobTitle,
          difficulty: session.difficulty as Difficulty,
          // Every InterviewStage is also an InterviewType (FULL_LOOP is the only extra member)
          interviewType: stageConfig.stage as InterviewType,
          parsedJob,
          companyIntel,
          resumeText: session.resumeText,
          language: session.language as Language,
          continuingStage: index > 0,
          questionCount: stageConfig.questionCount[1],
        }),
      ),
    );

    let order = 0;
    const rows: Array<{
      sessionId: string;
      order: number;
      text: string;
      category: string;
      stage: InterviewStage;
      metadata: string;
    }> = [];

    FULL_LOOP_STAGES.forEach((stageConfig, s) => {
      const maxCount = stageConfig.questionCount[1];
      for (const q of stageResults[s].questions.slice(0, maxCount)) {
        rows.push({
          sessionId: this.sessionId,
          order: order++,
          text: q.text,
          category: q.category,
          stage: stageConfig.stage,
          metadata: JSON.stringify(q),
        });
      }
    });

    await prisma.question.createMany({ data: rows });

    return {
      opening: stageResults[0].opening,
      closing: stageResults[stageResults.length - 1].closing,
    };
  }

  /**
   * Replay the current state to a (re)connected client. Called by the SSE
   * stream route right after a connection registers, so nothing emitted while
   * the client was disconnected is permanently lost:
   * - INTERVIEWING → current question + fresh audio
   * - WRAPPING_UP → completion redirect (and restart report generation if it died)
   * - COMPLETED → completion redirect
   * - anything else → just the status
   */
  async resume(): Promise<void> {
    const session = await this.loadSession();

    switch (session.status) {
      case "INTERVIEWING": {
        const questions = await this.loadQuestions();
        this.emit({ type: "state_change", data: { status: "INTERVIEWING" } });
        if (session.interviewType === "FULL_LOOP") {
          this.emit({
            type: "stage_transition",
            data: {
              completedStage: "",
              stageScore: 0,
              nextStage: stageLabel(questions[session.currentIndex]?.stage ?? null),
              transitionAudioUrl: "",
            },
          });
        }
        await this.presentQuestion(session, questions, session.currentIndex, {
          persistIndex: false,
        });
        return;
      }
      case "WRAPPING_UP": {
        this.emit({ type: "state_change", data: { status: "WRAPPING_UP" } });
        const existing = await prisma.report.findUnique({
          where: { sessionId: this.sessionId },
          select: { id: true },
        });
        if (existing) {
          await prisma.session.update({
            where: { id: this.sessionId, status: { not: "ABANDONED" } },
            data: { status: "COMPLETED" },
          });
          this.emitCompleted();
          return;
        }
        if (!this.reportPromise) {
          // Generation died with the previous process/request — restart it in
          // the background; the report page polls until it lands.
          void this.generateReport().catch(() => undefined);
        }
        this.emit({
          type: "interview_complete",
          data: { sessionId: this.sessionId, redirectTo: `/report/${this.sessionId}` },
        });
        return;
      }
      case "COMPLETED":
        this.emitCompleted();
        return;
      default:
        this.emit({ type: "state_change", data: { status: session.status } });
    }
  }

  // ---------------------------------------------------------------------------
  // Answer pipeline
  // ---------------------------------------------------------------------------

  async handleAnswer(audioBuffer: Buffer, mimeType = "audio/webm"): Promise<void> {
    if (this.answerPromise) {
      throw new OrchestratorError(
        "ANSWER_IN_FLIGHT",
        "An answer is already being processed",
        409,
      );
    }
    this.answerPromise = this.processAnswer(audioBuffer, mimeType).finally(() => {
      this.answerPromise = null;
    });
    await this.answerPromise;
  }

  private async processAnswer(audioBuffer: Buffer, mimeType: string): Promise<void> {
    const session = await this.loadSession();
    if (session.status !== "INTERVIEWING") {
      throw new OrchestratorError(
        "NOT_INTERVIEWING",
        `Cannot accept an answer while the session is ${session.status}`,
        409,
      );
    }

    const questions = await this.loadQuestions();
    const currentIndex = session.currentIndex;
    const current = questions[currentIndex];
    if (!current) {
      this.emit({
        type: "error",
        data: { code: "NO_QUESTION", message: "No current question found", retryable: false },
      });
      throw new OrchestratorError("NO_QUESTION", "No current question found", 500);
    }

    if (current.transcript !== null) {
      // Already answered (double submit / retry after a partial failure):
      // don't re-score it, just replay where we are.
      console.warn(`Answer for question ${current.id} already recorded; replaying state`);
      await this.presentQuestion(session, questions, currentIndex, { persistIndex: false });
      return;
    }

    // 1. Transcribe
    const transcript = await this.audioPipeline.transcribe(
      audioBuffer,
      session.language,
      mimeType,
    );
    this.emit({
      type: "transcription_complete",
      data: { questionId: current.id, transcript },
    });

    // 2. Evaluate
    const evaluation = await evaluateAnswer({
      companyName: session.companyName,
      jobTitle: session.jobTitle,
      difficulty: session.difficulty as Difficulty,
      questionText: current.text,
      targetSkill: current.targetSkill,
      scoringGuide: current.scoringGuide,
      transcript,
      resumeText: session.resumeText,
      language: session.language as Language,
    });
    this.emit({
      type: "evaluation_complete",
      data: { questionId: current.id, score: evaluation.score, tier: evaluation.tier },
    });

    // 3. Persist
    await prisma.question.update({
      where: { id: current.id },
      data: {
        transcript,
        score: evaluation.score,
        feedback: evaluation.shortFeedback,
        strengths: JSON.stringify(evaluation.keyStrengths),
        gaps: JSON.stringify(evaluation.gaps),
      },
    });
    current.score = evaluation.score;
    current.transcript = transcript;

    // 4. Decide what comes next
    const next = this.adaptiveEngine.selectNext(questions, evaluation, currentIndex);

    if (next.kind === "complete") {
      await this.finishInterview(session, current, evaluation.shortFeedback);
      return;
    }

    if (next.kind === "followUp") {
      await this.insertFollowUp(session, questions, currentIndex, next.text, evaluation.shortFeedback);
      return;
    }

    const target = questions[next.index];
    const crossesStage =
      session.interviewType === "FULL_LOOP" && target.stage !== current.stage;

    if (crossesStage) {
      await this.transitionStage(session, questions, current, next.index);
      return;
    }

    this.emit({ type: "transition_text", data: { message: evaluation.shortFeedback } });
    await this.presentQuestion(session, questions, next.index);
  }

  private async insertFollowUp(
    session: SessionRecord,
    questions: RuntimeQuestion[],
    currentIndex: number,
    followUpText: string,
    feedback: string,
  ): Promise<void> {
    const current = questions[currentIndex];
    const displaced = questions[currentIndex + 1];
    if (displaced) ttsCache.invalidate(displaced.id);

    const meta: QuestionMeta = {
      isFollowUp: true,
      parentQuestionId: current.id,
      difficulty: current.difficulty,
      targetSkill: current.targetSkill,
      scoringGuide: current.scoringGuide,
    };

    // Keep `order` dense and unique: shift everything after the current question.
    await prisma.$transaction([
      prisma.question.updateMany({
        where: { sessionId: this.sessionId, order: { gt: current.order } },
        data: { order: { increment: 1 } },
      }),
      prisma.question.create({
        data: {
          sessionId: this.sessionId,
          order: current.order + 1,
          text: followUpText,
          category: current.category,
          stage: current.stage,
          metadata: JSON.stringify(meta),
        },
      }),
    ]);

    const refreshed = await this.loadQuestions();
    this.emit({ type: "transition_text", data: { message: feedback } });
    await this.presentQuestion(session, refreshed, currentIndex + 1);
  }

  private async transitionStage(
    session: SessionRecord,
    questions: RuntimeQuestion[],
    current: RuntimeQuestion,
    nextIndex: number,
  ): Promise<void> {
    const stageScores = questions
      .filter((q) => q.stage === current.stage && typeof q.score === "number")
      .map((q) => q.score as number);
    const stageScore =
      stageScores.length > 0
        ? Math.round(stageScores.reduce((a, b) => a + b, 0) / stageScores.length)
        : 50;

    const completedLabel = stageLabel(current.stage);
    const nextLabel = stageLabel(questions[nextIndex].stage);

    const transitionText = await generateStageTransition({
      companyName: session.companyName,
      jobTitle: session.jobTitle,
      completedStage: (current.stage ?? "TECHNICAL") as InterviewStage,
      completedStageLabel: completedLabel,
      completedStageScore: stageScore,
      nextStageLabel: nextLabel,
      language: session.language as Language,
    });

    const transitionAudioUrl = await ttsCache.getOrGenerate(
      this.sessionId,
      transitionText,
      session.language,
    );

    this.emit({
      type: "stage_transition",
      data: {
        completedStage: completedLabel,
        stageScore,
        nextStage: nextLabel,
        transitionAudioUrl,
      },
    });

    if (this.avatarStream?.isActive) {
      await this.avatarStream.sendText(transitionText).catch(() => undefined);
    }

    await this.presentQuestion(session, questions, nextIndex);
  }

  /** Speak the closing, move to WRAPPING_UP and generate the report. */
  private async finishInterview(
    session: SessionRecord,
    lastQuestion: RuntimeQuestion,
    feedback: string,
  ): Promise<void> {
    const closing = session.closing || "That wraps up our interview. Thank you for your time today.";
    const closingText = `${feedback} ${closing}`;

    await prisma.session.update({
      where: { id: this.sessionId, status: "INTERVIEWING" },
      data: { status: "WRAPPING_UP" },
    });
    this.emit({ type: "state_change", data: { status: "WRAPPING_UP" } });
    this.emit({ type: "transition_text", data: { message: closing } });

    try {
      const audioUrl = await ttsCache.getOrGenerate(
        this.sessionId,
        closingText,
        session.language,
      );
      await this.emitAudioAndStream(lastQuestion.id, audioUrl, closingText);
    } catch (error) {
      console.warn("Closing TTS failed, continuing to report:", error);
    }

    // Report failure is surfaced via SSE; the answer itself succeeded.
    await this.generateReport().catch(() => undefined);
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  private emitCompleted(): void {
    this.emit({ type: "state_change", data: { status: "COMPLETED" } });
    this.emit({
      type: "interview_complete",
      data: { sessionId: this.sessionId, redirectTo: `/report/${this.sessionId}` },
    });
  }

  /**
   * Generate (or regenerate) the coaching report. Safe to call repeatedly:
   * concurrent calls share one promise and the Report row is upserted.
   * On failure the session stays WRAPPING_UP and an `error` event is emitted.
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
      const session = await this.loadSession();
      const questions = await this.loadQuestions();

      const coachNotes = await prisma.coachNote.findMany({
        where: { sessionId: this.sessionId },
        select: { questionId: true, prompt: true, selection: true, askedBeforeAnswer: true },
      });

      const questionsWithAnswers = questions
        .filter((q) => q.transcript)
        .map((q) => {
          const notes = coachNotes.filter((n) => n.questionId === q.id);
          return {
            text: q.text,
            category: q.category,
            transcript: q.transcript!,
            score: q.score ?? 50,
            keyStrengths: q.strengths,
            gaps: q.gaps,
            coachAsked: notes.map((n) => n.selection ? `"${n.selection.slice(0, 120)}" — ${n.prompt}` : n.prompt),
            coachedBeforeAnswer: notes.some((n) => n.askedBeforeAnswer),
          };
        });

      if (questionsWithAnswers.length === 0) {
        throw new OrchestratorError(
          "NO_ANSWERS",
          "No answered questions to build a report from",
          409,
        );
      }

      const report = await generateCoachingReport({
        companyName: session.companyName,
        jobTitle: session.jobTitle,
        difficulty: session.difficulty as Difficulty,
        interviewType: session.interviewType as InterviewType,
        questionsWithAnswers,
        resumeText: session.resumeText,
      language: session.language as Language,
      });

      const data = {
        overallScore: report.overallScore,
        technicalScore: report.dimensionScores.technical,
        behavioralScore: report.dimensionScores.behavioral,
        communicationScore: report.dimensionScores.communication,
        strengths: JSON.stringify(report.strengths),
        weaknesses: JSON.stringify(report.areasToImprove),
        studyPlan: JSON.stringify(report.studyPlan),
        summary: JSON.stringify(report),
      };

      await prisma.$transaction([
        prisma.report.upsert({
          where: { sessionId: this.sessionId },
          update: data,
          create: { sessionId: this.sessionId, ...data },
        }),
        prisma.session.update({
          where: { id: this.sessionId, status: { not: "ABANDONED" } },
          data: { status: "COMPLETED" },
        }),
      ]);

      this.emitCompleted();
      await this.teardownRuntime();
      return report;
    } catch (error) {
      console.error("Report generation failed:", error);
      this.emit({
        type: "error",
        data: {
          code: "REPORT_FAILED",
          message:
            "We couldn't generate your report. Your answers are saved — you can retry from the report page.",
          retryable: true,
        },
      });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Video (D-ID) relay
  // ---------------------------------------------------------------------------

  async handleSdpAnswer(sdpAnswer: { type: string; sdp?: string }): Promise<boolean> {
    if (!this.avatarStream?.isActive) return false;
    await this.avatarStream.sendSdpAnswer(sdpAnswer);
    return true;
  }

  async handleIceCandidate(candidate: {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
  }): Promise<boolean> {
    if (!this.avatarStream?.isActive) return false;
    await this.avatarStream.sendIceCandidate(candidate);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Release external resources once the interview is over. Audio blobs expire via TTL. */
  private async teardownRuntime(): Promise<void> {
    await this.avatarStream?.destroy().catch(() => undefined);
    this.avatarStream = null;
    orchestrators.delete(this.sessionId);
  }

  /** Hard teardown (session deleted / abandoned): also drops cached audio. */
  async destroy(): Promise<void> {
    await this.teardownRuntime();
    ttsCache.clearSession(this.sessionId);
  }

  async getState(): Promise<{ status: string; currentIndex: number; totalQuestions: number }> {
    const session = await prisma.session.findUniqueOrThrow({
      where: { id: this.sessionId },
      include: { _count: { select: { questions: true } } },
    });
    return {
      status: session.status,
      currentIndex: session.currentIndex,
      totalQuestions: session._count.questions,
    };
  }
}

export function getOrCreateOrchestrator(sessionId: string): InterviewOrchestrator {
  let orchestrator = orchestrators.get(sessionId);
  if (!orchestrator) {
    orchestrator = new InterviewOrchestrator(sessionId);
    orchestrators.set(sessionId, orchestrator);
  }
  return orchestrator;
}

/** Tear down and forget a session's orchestrator (used when a session is deleted). */
export async function destroyOrchestrator(sessionId: string): Promise<void> {
  const orchestrator = orchestrators.get(sessionId);
  if (orchestrator) {
    await orchestrator.destroy();
  } else {
    ttsCache.clearSession(sessionId);
  }
}
