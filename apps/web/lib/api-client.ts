import { apiErrorBodySchema, type ApiKeyProvider, type ErrorCode } from "@interviewiq/types";
import { getClientId } from "@/lib/client-id";

/** A non-2xx response from `/api/*`, decoded from the `{ error: { code, … } }` body. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  /** Set with MISSING_API_KEY: whose key the server is missing. */
  readonly provider?: ApiKeyProvider;

  constructor(
    code: ErrorCode,
    options: { status: number; retryable: boolean; provider?: ApiKeyProvider; message?: string },
  ) {
    super(options.message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = options.status;
    this.retryable = options.retryable;
    this.provider = options.provider;
  }
}

/** The request never got a response (offline, DNS, server down). */
export class NetworkError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Network request failed", options);
    this.name = "NetworkError";
  }
}

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  /** Serialized as the JSON body (and sets `Content-Type`). */
  json?: unknown;
  /** A raw body such as FormData. Ignored when `json` is set. */
  body?: BodyInit;
}

/**
 * Decode an error response. Bodies that don't match the API contract (a proxy
 * page, a dev-server crash) still become an ApiError, keyed by status.
 */
async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorBodySchema.safeParse(body);
  if (parsed.success) {
    const { code, message, retryable, provider } = parsed.data.error;
    return new ApiError(code, { status: response.status, retryable, provider, message });
  }
  const code: ErrorCode =
    response.status === 404
      ? "NOT_FOUND"
      : response.status === 403
        ? "FORBIDDEN"
        : "INTERNAL_ERROR";
  return new ApiError(code, { status: response.status, retryable: response.status >= 500 });
}

/**
 * `fetch` for this app's API: identifies the browser with `x-client-id`, sends
 * JSON, and throws `ApiError` for non-2xx responses or `NetworkError` when no
 * response arrived. Resolves with the raw Response for callers that stream or
 * branch on 2xx statuses (the report's 202).
 */
export async function apiRequest(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const { json, body, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("x-client-id", getClientId());
  if (json !== undefined) finalHeaders.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers: finalHeaders,
      body: json !== undefined ? JSON.stringify(json) : body,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new NetworkError({ cause: error });
  }

  if (!response.ok) throw await toApiError(response);
  return response;
}

/** `apiRequest` plus the decoded JSON body. */
export async function apiFetch<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const response = await apiRequest(path, init);
  return (await response.json()) as T;
}
