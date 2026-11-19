import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { sdpAnswerRequestSchema } from "@interviewiq/types";
import { withMockMode } from "@/lib/with-mock-mode";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { apiError, apiOk } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";

/** Relay the browser's WebRTC SDP answer to the session's D-ID stream. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;

    const rl = checkRateLimit(`avatar-sdp:${id}`, { maxRequests: 120, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const parsed = sdpAnswerRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError("INVALID_REQUEST");

    try {
      const relayed = await getOrCreateOrchestrator(id).handleSdpAnswer(parsed.data.sdpAnswer);
      return relayed ? apiOk({ ok: true }) : apiError("NO_AVATAR_STREAM");
    } catch (error) {
      return apiError(error, { fallback: "AVATAR_UNAVAILABLE", log: "SDP answer relay failed" });
    }
  });
}
