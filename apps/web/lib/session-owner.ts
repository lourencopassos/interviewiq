import { prisma } from "@interviewiq/db";
import { apiError } from "@/lib/api-response";
import { getRequestClientId } from "@/lib/http";

/**
 * Ownership is the anonymous client id stored with the session. Every `[id]`
 * route calls this: the caller's id comes from the `x-client-id` header, then
 * the `interviewiq-client` cookie (EventSource and <audio> can't set headers),
 * then `fallbackClientId` (a legacy body field).
 */
export async function assertOwner(id: string, request: Request, fallbackClientId?: string | null) {
  const clientId = getRequestClientId(request) ?? fallbackClientId ?? null;
  if (!clientId) {
    return { ok: false as const, response: apiError("FORBIDDEN") };
  }
  const session = await prisma.session.findUnique({
    where: { id },
    select: { id: true, clientId: true, status: true },
  });
  if (!session) {
    return { ok: false as const, response: apiError("SESSION_NOT_FOUND") };
  }
  if (session.clientId !== clientId) {
    return { ok: false as const, response: apiError("FORBIDDEN") };
  }
  return { ok: true as const, session };
}
