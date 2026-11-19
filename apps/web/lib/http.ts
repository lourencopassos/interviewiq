/** Request helpers shared by API route handlers. */

/** Cookie that mirrors the anonymous client id from localStorage (see lib/client-id.ts). */
export const CLIENT_ID_COOKIE = "interviewiq-client";
const MAX_CLIENT_ID_LENGTH = 128;

/**
 * Parse a JSON body, returning null for malformed input or a non-JSON content
 * type. A `text/plain` body needs no CORS preflight, so it must never be
 * treated as JSON (see middleware.ts).
 */
export async function readJson<T = unknown>(request: Request): Promise<T | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) return null;
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/** The caller's anonymous client id: `x-client-id` header first, then the client cookie. */
export function getRequestClientId(request: Request): string | null {
  const id = request.headers.get("x-client-id")?.trim() || readCookie(request, CLIENT_ID_COOKIE)?.trim();
  if (!id || id.length > MAX_CLIENT_ID_LENGTH) return null;
  return id;
}

/**
 * Best-effort caller address for rate-limit keys when there is no client id.
 * Only meaningful behind a proxy that sets these headers; locally it is "local".
 */
export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "local";
}
