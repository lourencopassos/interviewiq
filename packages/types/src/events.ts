import { z } from "zod";
import { InterviewStage, SessionStatus } from "./session";
import { errorCodeSchema } from "./errors";

const sessionStatusSchema = z.nativeEnum(SessionStatus);
const interviewStageSchema = z.nativeEnum(InterviewStage);

const sdpDescriptionSchema = z.object({ type: z.string(), sdp: z.string().optional() });
const iceServerSchema = z.object({
  urls: z.union([z.string(), z.array(z.string())]),
  username: z.string().optional(),
  credential: z.string().optional(),
});

/**
 * The SSE protocol of `/api/interview/[id]/stream`. Every message is one JSON
 * object `{ type, data }` on a `data:` line. This schema is the single source
 * of truth: the server builds events against the inferred type and the client
 * validates incoming payloads with `interviewEventSchema.safeParse`.
 */
export const interviewEventSchema = z.discriminatedUnion("type", [
  /** Session status changed; also replayed on every (re)connect. */
  z.object({ type: z.literal("state_change"), data: z.object({ status: sessionStatusSchema }) }),
  /** A question became current. `order` is 1-based; `stage` is null outside Full Loop. */
  z.object({
    type: z.literal("question_ready"),
    data: z.object({
      questionId: z.string(),
      text: z.string(),
      category: z.string(),
      order: z.number().int(),
      total: z.number().int(),
      stage: interviewStageSchema.nullable(),
      /** True for an ad-hoc follow-up inserted by the adaptive engine. */
      isFollowUp: z.boolean(),
    }),
  }),
  /** The spoken clip for `questionId` (question, or closing on the last one) can be played. */
  z.object({ type: z.literal("audio_ready"), data: z.object({ questionId: z.string(), audioUrl: z.string() }) }),
  /** Whisper finished transcribing the answer to `questionId`. */
  z.object({
    type: z.literal("transcription_complete"),
    data: z.object({ questionId: z.string(), transcript: z.string() }),
  }),
  /** The answer to `questionId` was scored. */
  z.object({
    type: z.literal("evaluation_complete"),
    data: z.object({
      questionId: z.string(),
      score: z.number(),
      tier: z.enum(["poor", "good", "excellent"]),
    }),
  }),
  /** One spoken sentence between questions (feedback), or the closing line. */
  z.object({ type: z.literal("transition_text"), data: z.object({ message: z.string() }) }),
  /** Full Loop stage boundary. `completedStage` and `transitionAudioUrl` are null for the opening stage intro. */
  z.object({
    type: z.literal("stage_transition"),
    data: z.object({
      completedStage: interviewStageSchema.nullable(),
      stageScore: z.number(),
      nextStage: interviewStageSchema,
      transitionAudioUrl: z.string().nullable(),
    }),
  }),
  /** The interview is over; navigate to `redirectTo` (the report page). */
  z.object({
    type: z.literal("interview_complete"),
    data: z.object({ sessionId: z.string(), redirectTo: z.string() }),
  }),
  /** Video mode: a fresh D-ID WebRTC offer to answer via /avatar-sdp and /avatar-ice. */
  z.object({
    type: z.literal("avatar_stream_ready"),
    data: z.object({
      sessionId: z.string(),
      streamId: z.string(),
      sdpOffer: sdpDescriptionSchema,
      iceServers: z.array(iceServerSchema),
      /** Still image of the presenter, shown while no frames are flowing. */
      presenterUrl: z.string().optional(),
    }),
  }),
  /** Video mode: the avatar started lip-syncing the line for `questionId`. */
  z.object({ type: z.literal("avatar_stream_audio"), data: z.object({ questionId: z.string() }) }),
  /** Video mode failed; continue audio-only. `reason` is English fallback copy. */
  z.object({
    type: z.literal("avatar_stream_failed"),
    data: z.object({
      code: z.enum(["AVATAR_UNAVAILABLE", "AVATAR_QUOTA", "AVATAR_NO_CREDITS"]),
      reason: z.string(),
    }),
  }),
  /** Something failed. Localize by `code`; `message` is an English fallback for logs, not for display. */
  z.object({
    type: z.literal("error"),
    data: z.object({ code: errorCodeSchema, retryable: z.boolean(), message: z.string().optional() }),
  }),
]);

export type InterviewEvent = z.infer<typeof interviewEventSchema>;
export type InterviewEventType = InterviewEvent["type"];
/** The event of one type, e.g. `InterviewEventOf<"question_ready">`. */
export type InterviewEventOf<T extends InterviewEventType> = Extract<InterviewEvent, { type: T }>;
