import { NextResponse, type NextRequest } from "next/server";
import type { ApiErrorBody } from "@interviewiq/types";

/**
 * Cross-site request protection for the API.
 *
 * InterviewIQ has no login: anyone who can reach the server can spend the
 * operator's API keys. Without this, any web page the operator visits could
 * POST to http://localhost:3100/api/... (a `text/plain` or form body needs no
 * CORS preflight) or open the paid SSE stream. So:
 *
 * - Every /api request whose `Sec-Fetch-Site` is present and not
 *   `same-origin`/`none` is rejected (403 CROSS_SITE). `none` is a direct
 *   navigation (typing the URL), which stays allowed.
 * - Mutations whose `Origin` host differs from the request host are rejected.
 * - Mutations with a body must be `application/json`, or `multipart/form-data`
 *   for the answer upload (415 otherwise). Bodyless POST/DELETE are fine.
 */
export const config = { matcher: "/api/:path*" };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ANSWER_ROUTE = /^\/api\/interview\/[^/]+\/answer\/?$/;

/** Same envelope as `apiError` (lib/api-response.ts), built here without the Node-only service layer. */
function reject(status: 403 | 415, code: "CROSS_SITE" | "UNSUPPORTED_MEDIA_TYPE", message: string) {
  const body: ApiErrorBody = { error: { code, message, retryable: false } };
  return NextResponse.json(body, { status });
}

function hasBody(request: NextRequest): boolean {
  if (request.headers.has("transfer-encoding")) return true;
  const length = request.headers.get("content-length");
  return length !== null && length !== "0";
}

export function middleware(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") {
    return reject(403, "CROSS_SITE", "Cross-site requests are not allowed");
  }

  if (SAFE_METHODS.has(request.method.toUpperCase())) return NextResponse.next();

  const origin = request.headers.get("origin");
  if (origin !== null) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      // "null" (sandboxed frames, file://) or garbage: not our page
    }
    if (!originHost || originHost !== host) {
      return reject(403, "CROSS_SITE", "Cross-site requests are not allowed");
    }
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType && !hasBody(request)) return NextResponse.next();

  const expected = ANSWER_ROUTE.test(request.nextUrl.pathname)
    ? "multipart/form-data"
    : "application/json";
  if (!contentType.startsWith(expected)) {
    return reject(415, "UNSUPPORTED_MEDIA_TYPE", `Content-Type must be ${expected}`);
  }

  return NextResponse.next();
}
