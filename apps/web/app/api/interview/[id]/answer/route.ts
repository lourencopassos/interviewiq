import { NextResponse } from "next/server";
import { getOrCreateOrchestrator, OrchestratorError } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { errorResponse, jsonError } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";
import { withMockMode } from "@/lib/with-mock-mode";

/** Generous ceiling for a spoken answer (a few minutes of compressed audio). */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
/** Multipart framing on top of the audio itself. */
const MAX_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Refuse oversized uploads before buffering anything.
  const declaredLength = Number(request.headers.get("content-length") ?? NaN);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonError(413, "TOO_LARGE", "Audio file too large");
  }

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;

    const rl = checkRateLimit(`answer:${id}`, { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    if (owner.session.status !== "INTERVIEWING") {
      return jsonError(409, "NOT_INTERVIEWING", `Session is ${owner.session.status}, not accepting answers`);
    }

    let audioFile: Blob;
    try {
      const formData = await request.formData();
      const field = formData.get("audio");
      if (!field || !(field instanceof Blob)) {
        return jsonError(400, "NO_AUDIO", "No audio file provided");
      }
      audioFile = field;
    } catch {
      return jsonError(400, "INVALID_MULTIPART", "Invalid multipart body");
    }

    if (audioFile.size === 0) {
      return jsonError(400, "EMPTY_AUDIO", "Audio file is empty");
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return jsonError(413, "TOO_LARGE", "Audio file too large");
    }

    try {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const orchestrator = getOrCreateOrchestrator(id);
      await orchestrator.handleAnswer(audioBuffer, audioFile.type || "audio/webm");
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof OrchestratorError && error.httpStatus < 500) {
        console.warn(`Answer rejected (${error.code}):`, error.message);
      } else {
        console.error("Answer submission failed:", error);
      }
      return errorResponse(error, { status: 500, code: "ANSWER_FAILED", error: "Failed to process answer" });
    }
  });
}
