import { NextResponse } from "next/server";
import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { jsonError } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";
import { withMockMode } from "@/lib/with-mock-mode";

/**
 * The browser asks for a fresh D-ID WebRTC offer when it needs one (mount,
 * reload, or after its peer connection failed). The offer itself arrives over
 * SSE as `avatar_stream_ready`; this just returns whether a stream was created.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;

    const rl = checkRateLimit(`avatar-offer:${id}`, { maxRequests: 6, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    try {
      const ok = await getOrCreateOrchestrator(id).requestAvatarOffer();
      return NextResponse.json({ ok });
    } catch (error) {
      console.error("Avatar offer failed:", error);
      return jsonError(502, "AVATAR_UNAVAILABLE", "Could not create an avatar stream", { ok: false });
    }
  });
}
