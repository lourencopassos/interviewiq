import { NextResponse } from "next/server";
import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { withMockMode } from "@/lib/with-mock-mode";

/**
 * The browser asks for a fresh D-ID WebRTC offer when it needs one (mount,
 * reload, or after its peer connection failed). The offer itself arrives over
 * SSE as `avatar_stream_ready`; this just returns whether a stream was created.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const rl = checkRateLimit(`avatar-offer:${id}`, { maxRequests: 6, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    try {
      const ok = await getOrCreateOrchestrator(id).requestAvatarOffer();
      return NextResponse.json({ ok });
    } catch (error) {
      console.error("Avatar offer failed:", error);
      return NextResponse.json({ ok: false, error: "Could not create an avatar stream" }, { status: 502 });
    }
  });
}
