import { prisma } from "@interviewiq/db";
import type { CoachNoteView, CoachRequest, Language } from "@interviewiq/types";
import { COACH_MODEL, streamClaudeText } from "../client";
import { isMockMode } from "../mock";
import { getMockCoachAnswer } from "../mock/fixtures/coach";
import { buildCoachSystemPrompt, buildCoachUserMessage } from "../prompts/coach-explainer";
import { OrchestratorError } from "./interview-orchestrator";

interface QuestionMeta {
  targetSkill?: string;
}

function toView(note: {
  id: string;
  questionId: string | null;
  source: string;
  selection: string | null;
  prompt: string;
  answer: string;
  askedBeforeAnswer: boolean;
  model: string;
  createdAt: Date;
}): CoachNoteView {
  return {
    id: note.id,
    questionId: note.questionId,
    source: note.source as CoachNoteView["source"],
    selection: note.selection,
    prompt: note.prompt,
    answer: note.answer,
    askedBeforeAnswer: note.askedBeforeAnswer,
    model: note.model,
    createdAt: note.createdAt.toISOString(),
  };
}

export async function listCoachNotes(sessionId: string): Promise<CoachNoteView[]> {
  const notes = await prisma.coachNote.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return notes.map(toView);
}

/**
 * Stream a coach answer for one request and persist it as a CoachNote when the
 * stream completes. Yields text deltas; the final value is the saved note.
 */
export async function* streamCoachAnswer(
  sessionId: string,
  request: CoachRequest,
): AsyncGenerator<string, CoachNoteView, void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      companyName: true,
      jobTitle: true,
      difficulty: true,
      language: true,
      status: true,
      coachEnabled: true,
      currentIndex: true,
    },
  });
  if (!session) throw new OrchestratorError("SESSION_NOT_FOUND", "Session not found", 404);
  if (!session.coachEnabled) {
    throw new OrchestratorError("COACH_DISABLED", "The coach is turned off for this session", 403);
  }
  if (session.status !== "INTERVIEWING") {
    throw new OrchestratorError(
      "NOT_INTERVIEWING",
      "The coach is only available during the interview",
      409,
    );
  }

  // Resolve the question: the one the client names, else the current one.
  const question = request.questionId
    ? await prisma.question.findFirst({
        where: { id: request.questionId, sessionId },
        select: { id: true, text: true, category: true, metadata: true, transcript: true },
      })
    : await prisma.question.findFirst({
        where: { sessionId, order: session.currentIndex },
        select: { id: true, text: true, category: true, metadata: true, transcript: true },
      });

  let targetSkill = "general";
  if (question?.metadata) {
    try {
      const meta = JSON.parse(question.metadata) as QuestionMeta;
      if (meta.targetSkill) targetSkill = meta.targetSkill;
    } catch {
      // ignore malformed metadata
    }
  }

  const priorNotes = await prisma.coachNote.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: { prompt: true, answer: true },
    take: 6,
  });

  const systemPrompt = buildCoachSystemPrompt({
    companyName: session.companyName,
    jobTitle: session.jobTitle,
    difficulty: session.difficulty,
    language: session.language as Language,
    question: question
      ? { text: question.text, category: question.category, targetSkill }
      : null,
    transcript: question?.transcript ?? null,
    priorNotes,
  });
  const userMessage = buildCoachUserMessage(request);

  let answer = "";
  const model = isMockMode() ? "mock" : COACH_MODEL;
  for await (const delta of streamClaudeText(systemPrompt, userMessage, {
    model: COACH_MODEL,
    maxTokens: 900,
    mockText: getMockCoachAnswer(request.selection, request.prompt),
  })) {
    answer += delta;
    yield delta;
  }

  const note = await prisma.coachNote.create({
    data: {
      sessionId,
      questionId: question?.id ?? null,
      source: request.source,
      selection: request.selection ?? null,
      prompt: request.prompt ?? (request.selection ? "Explain this" : ""),
      answer: answer.trim(),
      askedBeforeAnswer: question ? question.transcript === null : false,
      model,
    },
  });

  return toView(note);
}
