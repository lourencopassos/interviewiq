import { NextResponse } from "next/server";
import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { sdpAnswerRequestSchema } from "@interviewiq/types";
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

    const rl = checkRateLimit(`avatar-sdp:${id}`, { maxRequests: 120, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const parsed = sdpAnswerRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request", { details: parsed.error.flatten() });
    }

    try {
      const relayed = await getOrCreateOrchestrator(id).handleSdpAnswer(parsed.data.sdpAnswer);
      if (!relayed) {
        return jsonError(409, "NO_AVATAR_STREAM", "No active avatar stream for this session", { ok: false });
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("SDP answer relay failed:", error);
      return jsonError(502, "AVATAR_UNAVAILABLE", "Failed to relay SDP answer");
    }
  });
}
