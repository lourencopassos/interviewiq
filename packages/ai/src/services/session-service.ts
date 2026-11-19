import { prisma } from "@interviewiq/db";
import type { CreateSessionRequest, Difficulty, InterviewType } from "@interviewiq/types";
import { AppError } from "../errors";
import { destroyOrchestrator } from "../interview";

/** Session CRUD behind `/api/sessions`. Interview progress is owned by the orchestrator, not here. */

export async function createSession(input: CreateSessionRequest) {
  return prisma.session.create({
    data: {
      clientId: input.clientId,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      jobDescription: input.jobDescription,
      difficulty: input.difficulty,
      interviewType: input.interviewType,
      language: input.language,
      videoMode: input.videoMode ?? false,
      coachEnabled: input.coachEnabled ?? true,
      resumeText: input.resumeText,
      parsedJob: input.parsedJob,
      companyIntel: input.companyIntel,
      status: "SETUP",
    },
    select: { id: true, status: true, createdAt: true },
  });
}

/** What the interview page needs on load. */
export async function getSessionSummary(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
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
  if (!session) throw new AppError("SESSION_NOT_FOUND");
  return session;
}

export interface SessionFilters {
  difficulty?: Difficulty;
  interviewType?: InterviewType;
}

/**
 * The caller's sessions, newest first, in every status. Drafts (SETUP) and
 * abandoned sessions are included so the CV they hold can be deleted.
 */
export async function listSessions(clientId: string, filters: SessionFilters = {}) {
  return prisma.session.findMany({
    where: { clientId, ...filters },
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
}

/** The only client-driven transition: any unfinished state → ABANDONED. */
export async function abandonSession(sessionId: string): Promise<void> {
  const { count } = await prisma.session.updateMany({
    where: { id: sessionId, status: { not: "COMPLETED" } },
    data: { status: "ABANDONED" },
  });
  if (count === 0) throw new AppError("ALREADY_COMPLETED");
  await destroyOrchestrator(sessionId);
}

/** Delete one session with its questions, coach notes and report. */
export async function deleteSession(sessionId: string): Promise<void> {
  await destroyOrchestrator(sessionId);
  await prisma.session.delete({ where: { id: sessionId } });
}

/** Delete every session owned by `clientId`. Returns how many were deleted. */
export async function deleteClientSessions(clientId: string): Promise<number> {
  const sessions = await prisma.session.findMany({ where: { clientId }, select: { id: true } });
  // Stop live work (avatar streams, cached audio) before the rows disappear.
  await Promise.all(sessions.map((s) => destroyOrchestrator(s.id).catch(() => undefined)));
  const { count } = await prisma.session.deleteMany({ where: { clientId } });
  return count;
}
