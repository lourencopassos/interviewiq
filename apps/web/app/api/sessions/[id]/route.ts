import { NextResponse } from "next/server";
import { prisma } from "@interviewiq/db";
import { destroyOrchestrator } from "@interviewiq/ai";
import { updateSessionRequestSchema } from "@interviewiq/types";
import { readJson } from "@/lib/http";
import { jsonError } from "@/lib/api-response";
import { assertOwner } from "@/lib/session-owner";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await assertOwner(id, request);
  if (!owner.ok) return owner.response;

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
      return jsonError(404, "NOT_FOUND", "Session not found");
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Session fetch failed:", error);
    return jsonError(500, "FAILED", "Failed to fetch session");
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
    return jsonError(400, "INVALID_REQUEST", 'Only { status: "ABANDONED" } is supported', {
      details: parsed.error.flatten(),
    });
  }

  const owner = await assertOwner(id, request, parsed.data.clientId);
  if (!owner.ok) return owner.response;

  if (owner.session.status === "COMPLETED") {
    return jsonError(409, "ALREADY_COMPLETED", "A completed session cannot be abandoned");
  }

  try {
    const session = await prisma.session.updateMany({
      where: { id, status: { not: "COMPLETED" } },
      data: { status: "ABANDONED" },
    });
    if (!session.count) return jsonError(409, "ALREADY_COMPLETED", "Session already completed");
    await destroyOrchestrator(id);
    return NextResponse.json({ id, status: "ABANDONED" });
  } catch (error) {
    console.error("Session update failed:", error);
    return jsonError(500, "FAILED", "Failed to update session");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await assertOwner(id, request);
  if (!owner.ok) return owner.response;

  try {
    await destroyOrchestrator(id);
    await prisma.session.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Session delete failed:", error);
    return jsonError(500, "FAILED", "Failed to delete session");
  }
}
