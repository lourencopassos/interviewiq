import { z } from "zod";

/**
 * Every error code the server sends to the browser, in API error bodies, SSE
 * `error` events, coach stream errors and `avatar_stream_failed` events. The
 * client localizes by code; server messages are English fallbacks for logs.
 */
export const ERROR_CODES = [
  // Request validation
  "INVALID_JSON",
  "INVALID_REQUEST",
  "INVALID_MULTIPART",
  "NO_AUDIO",
  "EMPTY_AUDIO",
  "TOO_LARGE",
  "CLIENT_ID_REQUIRED",
  "UNSUPPORTED_MEDIA_TYPE",
  // Access and limits
  "CROSS_SITE",
  "FORBIDDEN",
  "RATE_LIMITED",
  "SESSION_NOT_FOUND",
  "NOT_FOUND",
  // Session state conflicts
  "NOT_INTERVIEWING",
  "ABANDONED",
  "ALREADY_COMPLETED",
  "NOT_FINISHED",
  "ANSWER_IN_FLIGHT",
  "COACH_DISABLED",
  "NO_AVATAR_STREAM",
  "NO_QUESTION",
  "NO_ANSWERS",
  // Providers
  "MISSING_API_KEY",
  "UPSTREAM_RATE_LIMITED",
  "EMPTY_QUESTION_SET",
  "AUDIO_UNAVAILABLE",
  "AVATAR_UNAVAILABLE",
  "AVATAR_QUOTA",
  "AVATAR_NO_CREDITS",
  // Operation failures
  "PARSE_FAILED",
  "START_FAILED",
  "ANSWER_FAILED",
  "REPORT_FAILED",
  "COACH_FAILED",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorCodeSchema = z.enum(ERROR_CODES);

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}

/** Stable codes for `avatar_stream_failed`; provider details stay in server logs. */
export type AvatarFailureCode = Extract<ErrorCode, "AVATAR_UNAVAILABLE" | "AVATAR_QUOTA" | "AVATAR_NO_CREDITS">;

/** Providers whose API key the server reads from the environment. */
export type ApiKeyProvider = "anthropic" | "openai" | "elevenlabs";

/** Body of every non-2xx JSON response from `/api/*`. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    /** Stable English fallback. Render a localized string for `code` instead. */
    message: z.string(),
    retryable: z.boolean(),
    /** Set with MISSING_API_KEY: which key to configure. */
    provider: z.enum(["anthropic", "openai", "elevenlabs"]).optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
