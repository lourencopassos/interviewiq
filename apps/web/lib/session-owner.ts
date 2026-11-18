import { NextResponse } from "next/server";
import { prisma } from "@interviewiq/db";

/**
 * Ownership is the anonymous clientId stored with the session. Mutating routes
 * require it; reads stay open because the interview/report pages fetch by id.
 */
export async function assertOwner(id: string, clientId: string | null) {
  if (!clientId) {
    return { ok: false as const, response: NextResponse.json({ error: "clientId is required" }, { status: 400 }) };
  }
  const session = await prisma.session.findUnique({
    where: { id },
    select: { id: true, clientId: true, status: true },
  });
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Session not found" }, { status: 404 }) };
  }
  if (session.clientId !== clientId) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}
