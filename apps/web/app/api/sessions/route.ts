import { NextResponse } from "next/server";
import { prisma } from "@interviewiq/db";
import { createSessionRequestSchema, Difficulty, InterviewType } from "@interviewiq/types";
import { readJson } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

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
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Session creation failed:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

const DIFFICULTIES = new Set<string>(Object.values(Difficulty));
const INTERVIEW_TYPES = new Set<string>(Object.values(InterviewType));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const difficulty = searchParams.get("difficulty");
  const interviewType = searchParams.get("interviewType");

  if (difficulty && !DIFFICULTIES.has(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty filter" }, { status: 400 });
  }
  if (interviewType && !INTERVIEW_TYPES.has(interviewType)) {
    return NextResponse.json({ error: "Invalid interviewType filter" }, { status: 400 });
  }

  try {
    const sessions = await prisma.session.findMany({
      where: {
        clientId,
        status: { notIn: ["SETUP", "ABANDONED"] },
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
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}
