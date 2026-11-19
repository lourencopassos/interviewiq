import { NextResponse } from "next/server";
import { AppError, MissingApiKeyError, toAppError } from "@interviewiq/ai";
import { isErrorCode, type ApiErrorBody, type ErrorCode } from "@interviewiq/types";

interface ApiErrorOptions {
  /** Code for anything that is not already an AppError. Defaults to INTERNAL_ERROR. */
  fallback?: ErrorCode;
  /** Log context, e.g. "Answer submission failed". Server errors log the cause; client errors a one-line warning. */
  log?: string;
  headers?: HeadersInit;
}

/** A successful JSON response. */
export function apiOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

/**
 * The error response every route returns: `{ error: { code, message, retryable, provider? } }`
 * with the status that belongs to the code. Pass an ErrorCode for a known
 * condition, or whatever was thrown: AppErrors keep their code, a provider 429
 * becomes UPSTREAM_RATE_LIMITED, anything else becomes `fallback` so provider
 * details never reach the client.
 */
export function apiError(error: ErrorCode | unknown, options: ApiErrorOptions = {}): NextResponse<ApiErrorBody> {
  const appError = isErrorCode(error) ? new AppError(error) : toAppError(error, options.fallback);

  if (options.log) {
    if (appError.status >= 500) console.error(`${options.log}:`, error);
    else console.warn(`${options.log} (${appError.code})`, appError.details ?? "");
  }

  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      retryable: appError.retryable,
      ...(appError instanceof MissingApiKeyError && { provider: appError.provider }),
    },
  };
  return NextResponse.json(body, { status: appError.status, headers: options.headers });
}
