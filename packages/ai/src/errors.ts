import type { ApiKeyProvider, ErrorCode } from "@interviewiq/types";

export type { ApiKeyProvider };

interface ErrorSpec {
  status: number;
  retryable: boolean;
  /** Stable English fallback. Clients localize by code. */
  message: string;
}

/** HTTP status, retry hint and fallback copy for every code. */
const ERROR_SPEC: Record<ErrorCode, ErrorSpec> = {
  INVALID_JSON: { status: 400, retryable: false, message: "Invalid JSON body" },
  INVALID_REQUEST: { status: 400, retryable: false, message: "Invalid request" },
  INVALID_MULTIPART: { status: 400, retryable: false, message: "Invalid multipart body" },
  NO_AUDIO: { status: 400, retryable: false, message: "No audio file provided" },
  EMPTY_AUDIO: { status: 400, retryable: false, message: "Audio file is empty" },
  TOO_LARGE: { status: 413, retryable: false, message: "Audio file too large" },
  CLIENT_ID_REQUIRED: { status: 400, retryable: false, message: "A client id is required" },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, retryable: false, message: "Unsupported Content-Type" },
  CROSS_SITE: { status: 403, retryable: false, message: "Cross-site requests are not allowed" },
  FORBIDDEN: { status: 403, retryable: false, message: "Forbidden" },
  RATE_LIMITED: { status: 429, retryable: true, message: "Too many requests. Please try again later." },
  SESSION_NOT_FOUND: { status: 404, retryable: false, message: "Session not found" },
  NOT_FOUND: { status: 404, retryable: false, message: "Not found" },
  NOT_INTERVIEWING: { status: 409, retryable: false, message: "The session is not accepting answers" },
  ABANDONED: { status: 409, retryable: false, message: "This interview was abandoned and cannot be restarted" },
  ALREADY_COMPLETED: { status: 409, retryable: false, message: "A completed session cannot be abandoned" },
  NOT_FINISHED: { status: 409, retryable: false, message: "Finish the interview before generating a report" },
  ANSWER_IN_FLIGHT: { status: 409, retryable: false, message: "An answer is already being processed" },
  COACH_DISABLED: { status: 403, retryable: false, message: "The coach is turned off for this session" },
  NO_AVATAR_STREAM: { status: 409, retryable: false, message: "No active avatar stream for this session" },
  NO_QUESTION: { status: 500, retryable: false, message: "No current question found" },
  NO_ANSWERS: { status: 409, retryable: false, message: "No answered questions to build a report from" },
  MISSING_API_KEY: { status: 503, retryable: false, message: "A provider API key is not configured" },
  UPSTREAM_RATE_LIMITED: {
    status: 429,
    retryable: true,
    message: "The AI provider is rate limiting requests. Please try again shortly.",
  },
  EMPTY_QUESTION_SET: {
    status: 502,
    retryable: true,
    message: "The interviewer could not generate questions for this role. Please try again.",
  },
  AUDIO_UNAVAILABLE: {
    status: 502,
    retryable: false,
    message: "Audio couldn't be generated for this question. Please read it and record your answer.",
  },
  AVATAR_UNAVAILABLE: { status: 502, retryable: true, message: "The video interviewer is unavailable. Continuing with audio." },
  AVATAR_QUOTA: {
    status: 502,
    retryable: true,
    message: "The video service is at its concurrent stream limit. Continuing with audio.",
  },
  AVATAR_NO_CREDITS: {
    status: 502,
    retryable: false,
    message: "The video service account has no credits left. Continuing with audio.",
  },
  PARSE_FAILED: { status: 502, retryable: true, message: "Failed to parse job description. Please try again." },
  START_FAILED: { status: 500, retryable: true, message: "Failed to start the interview. Please try again." },
  ANSWER_FAILED: { status: 500, retryable: true, message: "Failed to process answer" },
  REPORT_FAILED: {
    status: 500,
    retryable: true,
    message: "We couldn't generate your report. Your answers are saved — you can retry from the report page.",
  },
  COACH_FAILED: { status: 502, retryable: true, message: "The coach is unavailable right now" },
  INTERNAL_ERROR: { status: 500, retryable: true, message: "Something went wrong. Please try again." },
};

export interface AppErrorOptions {
  /** Override the fallback copy. Must be fixed, server-authored text: it reaches the client. */
  message?: string;
  status?: number;
  retryable?: boolean;
  /** Diagnostic context for server logs only; never serialized to the client. */
  details?: unknown;
  cause?: unknown;
}

/**
 * The one error type the service layer throws on purpose. Routes map it to
 * `{ error: { code, message, retryable } }` and the orchestrator to an SSE
 * `error` event, so neither needs to know which module failed.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    const spec = ERROR_SPEC[code];
    super(options.message ?? spec.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? spec.status;
    this.retryable = options.retryable ?? spec.retryable;
    this.details = options.details;
  }
}

const ENV_VAR: Record<ApiKeyProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  elevenlabs: "ELEVENLABS_API_KEY",
};

/**
 * Thrown before calling a provider whose key is not configured, so routes can
 * answer with an actionable 503 instead of a generic upstream failure.
 */
export class MissingApiKeyError extends AppError {
  readonly envVar: string;

  constructor(public readonly provider: ApiKeyProvider) {
    super("MISSING_API_KEY", {
      message: `${ENV_VAR[provider]} is not set. Add it to apps/web/.env.local or enable mock mode.`,
    });
    this.name = "MissingApiKeyError";
    this.envVar = ENV_VAR[provider];
  }
}

/** Return the provider's key, or throw MissingApiKeyError when it is empty or unset. */
export function requireApiKey(provider: ApiKeyProvider): string {
  const key = process.env[ENV_VAR[provider]]?.trim();
  if (!key) throw new MissingApiKeyError(provider);
  return key;
}

function isUpstreamRateLimit(error: unknown): boolean {
  return error instanceof Error && "status" in error && error.status === 429;
}

/**
 * Normalize anything thrown into an AppError. Our own errors pass through, a
 * provider 429 becomes UPSTREAM_RATE_LIMITED, and everything else becomes
 * `fallback` with the original kept as `cause` for the log.
 */
export function toAppError(error: unknown, fallback: ErrorCode = "INTERNAL_ERROR"): AppError {
  if (error instanceof AppError) return error;
  if (isUpstreamRateLimit(error)) return new AppError("UPSTREAM_RATE_LIMITED", { cause: error });
  return new AppError(fallback, { cause: error });
}
