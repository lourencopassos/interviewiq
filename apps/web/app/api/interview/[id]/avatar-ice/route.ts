import { NextResponse } from "next/server";
import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { iceCandidateRequestSchema } from "@interviewiq/types";
import { withMockMode } from "@/lib/with-mock-mode";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { jsonError } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;

    // A WebRTC negotiation trickles a few dozen candidates; this only stops floods.
    const rl = checkRateLimit(`avatar-ice:${id}`, { maxRequests: 120, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const parsed = iceCandidateRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request", { details: parsed.error.flatten() });
    }

    try {
      const relayed = await getOrCreateOrchestrator(id).handleIceCandidate(parsed.data.candidate);
      return NextResponse.json({ ok: relayed });
    } catch (error) {
      console.error("ICE candidate relay failed:", error);
      return jsonError(502, "AVATAR_UNAVAILABLE", "Failed to relay ICE candidate");
    }
  });
}
