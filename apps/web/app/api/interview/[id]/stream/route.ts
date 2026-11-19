import { getOrCreateOrchestrator, sseEmitter } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { assertOwner } from "@/lib/session-owner";
import { withMockMode } from "@/lib/with-mock-mode";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for one interview session.
 *
 * On every (re)connect the orchestrator replays the current state (status,
 * current question + audio, or completion), so events emitted while the client
 * was not subscribed are never permanently lost. The emitter sends a `: ping`
 * comment every 15s so proxies keep the connection open.
 *
 * Ownership is checked via the client cookie (EventSource can't send headers).
 * Replay can synthesize audio, so connects are rate limited per session.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;

    const rl = checkRateLimit(`stream:${id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    let registered: ReadableStreamDefaultController | null = null;

    const stream = new ReadableStream({
      start(controller) {
        registered = controller;
        sseEmitter.register(id, controller);
        // Replay after registering so nothing falls into the gap.
        void getOrCreateOrchestrator(id)
          .resume()
          .catch((error) => console.error("SSE replay failed:", error));
      },
      cancel() {
        // Only drop our own registration — a newer connection may have replaced us.
        if (registered) sseEmitter.unregister(id, registered);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
