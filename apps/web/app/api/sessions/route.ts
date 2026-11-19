import { NextResponse } from "next/server";
import { prisma } from "@interviewiq/db";
import { destroyOrchestrator } from "@interviewiq/ai";
import { createSessionRequestSchema, Difficulty, InterviewType } from "@interviewiq/types";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRequestClientId, readJson } from "@/lib/http";
import { jsonError } from "@/lib/api-response";
import { withMockMode } from "@/lib/with-mock-mode";

export async function POST(request: Request) {
  return withMockMode(async () => {
    const body = await readJson(request);
    if (body === null) {
      return jsonError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const parsed = createSessionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request", { details: parsed.error.flatten() });
    }

    const rl = checkRateLimit(`sessions:${parsed.data.clientId}`, { maxRequests: 20, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    try {
      const session = await prisma.session.create({
        data: {
          clientId: parsed.data.clientId,
          jobTitle: parsed.data.jobTitle,
          companyName: parsed.data.companyName,
          jobDescription: parsed.data.jobDescription,
          difficulty: parsed.data.difficulty,
          interviewType: parsed.data.interviewType,
          language: parsed.data.language,
          videoMode: parsed.data.videoMode ?? false,
          coachEnabled: parsed.data.coachEnabled ?? true,
          resumeText: parsed.data.resumeText,
          parsedJob: parsed.data.parsedJob,
          companyIntel: parsed.data.companyIntel,
          status: "SETUP",
        },
        select: { id: true, status: true, createdAt: true },
      });

      return NextResponse.json(session, { status: 201 });
    } catch (error) {
      console.error("Session creation failed:", error);
      return jsonError(500, "FAILED", "Failed to create session");
    }
  });
}

const DIFFICULTIES = new Set<string>(Object.values(Difficulty));
const INTERVIEW_TYPES = new Set<string>(Object.values(InterviewType));

/**
 * List the caller's sessions, newest first, in every status. Drafts (SETUP)
 * and abandoned sessions are included so the CV they hold can be deleted.
 */
export async function GET(request: Request) {
  const clientId = getRequestClientId(request);
  if (!clientId) {
    return jsonError(400, "CLIENT_ID_REQUIRED", "A client id is required");
  }

  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get("difficulty");
  const interviewType = searchParams.get("interviewType");

  if (difficulty && !DIFFICULTIES.has(difficulty)) {
    return jsonError(400, "INVALID_REQUEST", "Invalid difficulty filter");
  }
  if (interviewType && !INTERVIEW_TYPES.has(interviewType)) {
    return jsonError(400, "INVALID_REQUEST", "Invalid interviewType filter");
  }

  try {
    const sessions = await prisma.session.findMany({
      where: {
        clientId,
        ...(difficulty ? { difficulty: difficulty as Difficulty } : {}),
        ...(interviewType ? { interviewType: interviewType as InterviewType } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        jobTitle: true,
        companyName: true,
        difficulty: true,
        interviewType: true,
        status: true,
        report: { select: { overallScore: true } },
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Session list failed:", error);
    return jsonError(500, "FAILED", "Failed to fetch sessions");
  }
}

/** Delete every session (with its questions, coach notes and report) owned by the caller. */
export async function DELETE(request: Request) {
  const clientId = getRequestClientId(request);
  if (!clientId) {
    return jsonError(400, "CLIENT_ID_REQUIRED", "A client id is required");
  }

  const rl = checkRateLimit(`sessions-delete:${clientId}`, { maxRequests: 5, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const sessions = await prisma.session.findMany({ where: { clientId }, select: { id: true } });
    // Stop live work (avatar streams, cached audio) before the rows disappear.
    await Promise.all(sessions.map((s) => destroyOrchestrator(s.id).catch(() => undefined)));
    const { count } = await prisma.session.deleteMany({ where: { clientId } });
    return NextResponse.json({ deleted: count });
  } catch (error) {
    console.error("Bulk session delete failed:", error);
    return jsonError(500, "FAILED", "Failed to delete sessions");
  }
}
