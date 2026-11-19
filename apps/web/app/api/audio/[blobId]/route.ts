import { ttsCache } from "@interviewiq/ai";
import { apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ blobId: string }> },
) {
  const { blobId } = await params;
  const audio = ttsCache.getAudio(blobId);
  if (!audio) return apiError("NOT_FOUND");

  return new Response(new Uint8Array(audio.buffer), {
    headers: {
      "Content-Type": audio.contentType,
      "Content-Length": audio.buffer.length.toString(),
      // Per-user interview audio: cacheable by the browser only, not shared caches.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
