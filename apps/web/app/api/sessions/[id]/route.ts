import { NextResponse } from "next/server";
import { prisma } from "@interviewiq/db";
import { destroyOrchestrator } from "@interviewiq/ai";
import { updateSessionRequestSchema } from "@interviewiq/types";
import { readJson } from "@/lib/rate-limit";

import { assertOwner } from "@/lib/session-owner";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        jobTitle: true,
        difficulty: true,
        interviewType: true,
        language: true,
        videoMode: true,
        coachEnabled: true,
        status: true,
        currentIndex: true,
        _count: { select: { questions: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Session fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

/**
 * The only client-driven status transition is abandoning an in-progress interview.
 * Every other transition is owned by the orchestrator.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = updateSessionRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Only { clientId, status: "ABANDONED" } is supported', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const owner = await assertOwner(id, parsed.data.clientId);
  if (!owner.ok) return owner.response;

  if (owner.session.status === "COMPLETED") {
    return NextResponse.json(
      { error: "A completed session cannot be abandoned" },
      { status: 409 },
    );
  }

  try {
    const session = await prisma.session.updateMany({
      where: { id, status: { not: "COMPLETED" } },
      data: { status: "ABANDONED" },
    });
    if (!session.count) return NextResponse.json({ error: "Session already completed" }, { status: 409 });
    await destroyOrchestrator(id);
    return NextResponse.json(await prisma.session.findUnique({ where: { id } }));
  } catch (error) {
    console.error("Session update failed:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clientId = new URL(request.url).searchParams.get("clientId");

  const owner = await assertOwner(id, clientId);
  if (!owner.ok) return owner.response;

  try {
    await destroyOrchestrator(id);
    await prisma.session.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Session delete failed:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
