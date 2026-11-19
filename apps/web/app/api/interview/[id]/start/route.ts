import { NextResponse } from "next/server";
import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { errorResponse, jsonError } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";
import { withMockMode } from "@/lib/with-mock-mode";

/**
 * Start (or resume) an interview.
 * - SETUP / BRIEFING → generates questions and emits the first one (idempotent)
 * - INTERVIEWING / WRAPPING_UP / COMPLETED → replays current state over SSE
 *
 * Failures return `{ error, code, retryable }` with a fixed message; the cause
 * chain and provider bodies are only logged.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;

    const rl = checkRateLimit(`start:${id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    if (owner.session.status === "ABANDONED") {
      return jsonError(409, "ABANDONED", "This interview was abandoned and cannot be restarted", {
        retryable: false,
      });
    }

    try {
      const outcome = await getOrCreateOrchestrator(id).startInterview();
      return NextResponse.json({
        ok: true,
        resumed: outcome === "resumed",
        pending: outcome === "pending",
      });
    } catch (error) {
      console.error("Interview start failed:", error);
      const upstreamRateLimited =
        error instanceof Error && "status" in error && error.status === 429;
      if (upstreamRateLimited) {
        return jsonError(429, "UPSTREAM_RATE_LIMITED", "The AI provider is rate limiting requests. Please try again shortly.", {
          retryable: true,
        });
      }
      return errorResponse(error, {
        status: 500,
        code: "START_FAILED",
        error: "Failed to start the interview. Please try again.",
      });
    }
  });
}
