import { NextResponse } from "next/server";
import { MissingApiKeyError, OrchestratorError } from "@interviewiq/ai";

/** JSON error body every API route uses: a stable `code`, a safe `error` message. */
export function jsonError(
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ error, code, ...extra }, { status });
}

export function missingApiKeyResponse(error: MissingApiKeyError) {
  return jsonError(503, error.code, error.message, { provider: error.provider, retryable: false });
}

/**
 * Map a thrown error to a response without leaking provider details:
 * - MissingApiKeyError → 503 MISSING_API_KEY with the env var to set
 * - OrchestratorError  → its status, code and (fixed, server-authored) message
 * - anything else      → the caller's generic fallback
 * The caller is responsible for logging the original error.
 */
export function errorResponse(
  error: unknown,
  fallback: { status: number; code: string; error: string; retryable?: boolean },
) {
  if (error instanceof MissingApiKeyError) return missingApiKeyResponse(error);
  if (error instanceof OrchestratorError) {
    return jsonError(error.httpStatus, error.code, error.message, {
      retryable: error.httpStatus >= 500,
    });
  }
  return jsonError(fallback.status, fallback.code, fallback.error, {
    retryable: fallback.retryable ?? true,
  });
}
