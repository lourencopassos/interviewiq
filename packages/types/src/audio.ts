/**
 * Map a MediaRecorder mime type to a canonical audio type Whisper accepts,
 * with a matching filename extension. Shared by the browser upload and the
 * server-side transcription so both agree on the container.
 */
export function normalizeAudioMimeType(mimeType: string): { type: string; extension: string } {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  switch (base) {
    case "audio/mp4":
    case "video/mp4":
    case "audio/x-m4a":
    case "audio/m4a":
      return { type: "audio/mp4", extension: "m4a" };
    case "audio/ogg":
      return { type: "audio/ogg", extension: "ogg" };
    case "audio/wav":
    case "audio/x-wav":
      return { type: "audio/wav", extension: "wav" };
    case "audio/mpeg":
    case "audio/mp3":
      return { type: "audio/mpeg", extension: "mp3" };
    case "audio/webm":
    default:
      return { type: "audio/webm", extension: "webm" };
  }
}
