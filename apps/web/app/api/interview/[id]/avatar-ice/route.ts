import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { iceCandidateRequestSchema } from "@interviewiq/types";
import { withMockMode } from "@/lib/with-mock-mode";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { apiError, apiOk } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";

/** Relay one browser ICE candidate to the session's D-ID stream. */
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
    if (!parsed.success) return apiError("INVALID_REQUEST");

    try {
      const relayed = await getOrCreateOrchestrator(id).handleIceCandidate(parsed.data.candidate);
      return apiOk({ ok: relayed });
    } catch (error) {
      return apiError(error, { fallback: "AVATAR_UNAVAILABLE", log: "ICE candidate relay failed" });
    }
  });
}
