import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { apiError, apiOk } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";
import { withMockMode } from "@/lib/with-mock-mode";

/** Generous ceiling for a spoken answer (a few minutes of compressed audio). */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
/** Multipart framing on top of the audio itself. */
const MAX_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;

/** Read the `audio` field of a multipart body, or the error code explaining why there is none. */
async function readAudio(request: Request): Promise<Blob | "NO_AUDIO" | "INVALID_MULTIPART"> {
  try {
    const field = (await request.formData()).get("audio");
    return field instanceof Blob ? field : "NO_AUDIO";
  } catch {
    return "INVALID_MULTIPART";
  }
}

/** Submit the spoken answer to the current question. Results arrive over SSE. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Refuse oversized uploads before buffering anything.
  const declaredLength = Number(request.headers.get("content-length") ?? NaN);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return apiError("TOO_LARGE");

  return withMockMode(async () => {
    const owner = await assertOwner(id, request);
    if (!owner.ok) return owner.response;

    const rl = checkRateLimit(`answer:${id}`, { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    if (owner.session.status !== "INTERVIEWING") return apiError("NOT_INTERVIEWING");

    const audio = await readAudio(request);
    if (typeof audio === "string") return apiError(audio);
    if (audio.size === 0) return apiError("EMPTY_AUDIO");
    if (audio.size > MAX_AUDIO_BYTES) return apiError("TOO_LARGE");

    try {
      const buffer = Buffer.from(await audio.arrayBuffer());
      await getOrCreateOrchestrator(id).handleAnswer(buffer, audio.type || "audio/webm");
      return apiOk({ ok: true });
    } catch (error) {
      return apiError(error, { fallback: "ANSWER_FAILED", log: "Answer submission failed" });
    }
  });
}
