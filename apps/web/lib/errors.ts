import type { ApiKeyProvider, ErrorCode } from "@interviewiq/types";
import { ApiError, NetworkError } from "@/lib/api-client";
import { interpolate, type Dictionary } from "@/lib/i18n";

/** Failures that happen in the browser, before or without a server response. */
export const CLIENT_ERROR_CODES = [
  "NETWORK",
  "MIC_NOT_FOUND",
  "RECORD_START_FAILED",
  "RECORD_FAILED",
  "UNKNOWN",
] as const;
export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];

export class ClientError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    options?: { cause?: unknown },
  ) {
    super(code, options);
    this.name = "ClientError";
  }
}

/** Every error the UI knows how to describe. */
export type UiError = ApiError | NetworkError | ClientError;

/** Normalize anything caught into a UiError; unknown failures become `fallback`. */
export function toUiError(error: unknown, fallback: ClientErrorCode = "UNKNOWN"): UiError {
  if (error instanceof ApiError || error instanceof NetworkError || error instanceof ClientError)
    return error;
  // A bare fetch() rejects with TypeError when the network is down.
  if (error instanceof TypeError) return new NetworkError({ cause: error });
  return new ClientError(fallback, { cause: error });
}

const ENV_VAR: Record<ApiKeyProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  elevenlabs: "ELEVENLABS_API_KEY",
};

/**
 * Interface-language copy for an error. This is the only place codes become
 * text: API and SSE codes come from `t.errors.api`, browser-side failures from
 * `t.errors.client`. Server `message` fields are never rendered.
 */
export function describeError(t: Dictionary, error: unknown): string {
  const uiError = toUiError(error);
  if (uiError instanceof ApiError) {
    if (uiError.code === "MISSING_API_KEY" && uiError.provider) {
      return interpolate(t.errors.missingApiKey, { envVar: ENV_VAR[uiError.provider] });
    }
    return t.errors.api[uiError.code];
  }
  if (uiError instanceof NetworkError) return t.errors.client.NETWORK;
  return t.errors.client[uiError.code];
}

/** Copy for a bare server code, e.g. an SSE `error` or `avatar_stream_failed` event. */
export function describeErrorCode(t: Dictionary, code: ErrorCode): string {
  return t.errors.api[code];
}
