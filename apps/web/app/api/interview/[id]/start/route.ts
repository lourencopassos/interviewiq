import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";
import { withMockMode } from "@/lib/with-mock-mode";

/**
 * Start (or resume) an interview.
 * - SETUP / BRIEFING → generates questions and emits the first one (idempotent)
 * - INTERVIEWING / WRAPPING_UP / COMPLETED → replays current state over SSE
 *
 * Failures return the standard error body with a fixed message; the cause
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

    if (owner.session.status === "ABANDONED") return apiError("ABANDONED");

    try {
      const outcome = await getOrCreateOrchestrator(id).startInterview();
      return apiOk({ ok: true, resumed: outcome === "resumed", pending: outcome === "pending" });
    } catch (error) {
      return apiError(error, { fallback: "START_FAILED", log: "Interview start failed" });
    }
  });
}
