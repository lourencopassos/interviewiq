import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";
import { withMockMode } from "@/lib/with-mock-mode";

/**
 * Ask the avatar to lip-sync the current line. Called by the client the moment
 * the question audio starts playing, so video and voice stay aligned.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;

    const rl = checkRateLimit(`avatar-speak:${id}`, { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    try {
      return apiOk({ ok: await getOrCreateOrchestrator(id).speakCurrent() });
    } catch (error) {
      return apiError(error, { fallback: "AVATAR_UNAVAILABLE", log: "Avatar speak failed" });
    }
  });
}
