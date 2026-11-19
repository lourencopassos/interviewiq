import type {
  AnswerEvaluation,
  AvatarFailureCode,
  InterviewEventOf,
  InterviewStage,
  SessionStatus,
} from "@interviewiq/types";
import type { AppError } from "../errors";
import type { StreamSession } from "../services/avatar-stream";
import type { RuntimeQuestion } from "./question-repository";

/** English fallback copy for `avatar_stream_failed`; clients localize by code. */
const AVATAR_FAILURE_REASON: Record<AvatarFailureCode, string> = {
  AVATAR_UNAVAILABLE: "The video interviewer is unavailable. Continuing with audio.",
  AVATAR_QUOTA: "The video service is at its concurrent stream limit. Continuing with audio.",
  AVATAR_NO_CREDITS: "The video service account has no credits left. Continuing with audio.",
};

/**
 * Typed constructors for every SSE event the orchestrator sends, so each
 * payload shape is written exactly once and checked against `InterviewEvent`.
 */
export const events = {
  stateChange: (status: SessionStatus): InterviewEventOf<"state_change"> => ({
    type: "state_change",
    data: { status },
  }),

  /** `index` is 0-based; the wire `order` is 1-based. */
  questionReady: (question: RuntimeQuestion, index: number, total: number): InterviewEventOf<"question_ready"> => ({
    type: "question_ready",
    data: {
      questionId: question.id,
      text: question.text,
      category: question.category,
      order: index + 1,
      total,
      stage: question.stage,
      isFollowUp: question.isFollowUp,
    },
  }),

  audioReady: (questionId: string, audioUrl: string): InterviewEventOf<"audio_ready"> => ({
    type: "audio_ready",
    data: { questionId, audioUrl },
  }),

  transcription: (questionId: string, transcript: string): InterviewEventOf<"transcription_complete"> => ({
    type: "transcription_complete",
    data: { questionId, transcript },
  }),

  evaluation: (questionId: string, evaluation: AnswerEvaluation): InterviewEventOf<"evaluation_complete"> => ({
    type: "evaluation_complete",
    data: { questionId, score: evaluation.score, tier: evaluation.tier },
  }),

  transitionText: (message: string): InterviewEventOf<"transition_text"> => ({
    type: "transition_text",
    data: { message },
  }),

  /** Announce the stage the interview starts (or resumes) in; nothing was completed yet. */
  stageIntro: (stage: InterviewStage): InterviewEventOf<"stage_transition"> => ({
    type: "stage_transition",
    data: { completedStage: null, stageScore: 0, nextStage: stage, transitionAudioUrl: null },
  }),

  stageTransition: (
    completedStage: InterviewStage,
    stageScore: number,
    nextStage: InterviewStage,
    transitionAudioUrl: string,
  ): InterviewEventOf<"stage_transition"> => ({
    type: "stage_transition",
    data: { completedStage, stageScore, nextStage, transitionAudioUrl },
  }),

  complete: (sessionId: string): InterviewEventOf<"interview_complete"> => ({
    type: "interview_complete",
    data: { sessionId, redirectTo: `/report/${sessionId}` },
  }),

  avatarReady: (sessionId: string, stream: StreamSession): InterviewEventOf<"avatar_stream_ready"> => ({
    type: "avatar_stream_ready",
    data: {
      sessionId,
      streamId: stream.id,
      sdpOffer: stream.offer,
      iceServers: stream.iceServers,
      presenterUrl: stream.presenterUrl,
    },
  }),

  avatarAudio: (questionId: string): InterviewEventOf<"avatar_stream_audio"> => ({
    type: "avatar_stream_audio",
    data: { questionId },
  }),

  avatarFailed: (code: AvatarFailureCode): InterviewEventOf<"avatar_stream_failed"> => ({
    type: "avatar_stream_failed",
    data: { code, reason: AVATAR_FAILURE_REASON[code] },
  }),

  /** `message` is our own fixed copy (never provider text); clients render by code. */
  error: (error: AppError): InterviewEventOf<"error"> => ({
    type: "error",
    data: { code: error.code, retryable: error.retryable, message: error.message },
  }),
};
