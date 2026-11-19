import { prisma } from "@interviewiq/db";
import type { CoachingReport } from "@interviewiq/types";
import { AppError } from "../errors";
import { generateCoachingReport } from "../prompts/report-generator";
import type { PromptContext } from "./prompt-context";
import type { RuntimeQuestion } from "./question-repository";
import type { SessionRepository } from "./session-repository";

const COACH_SELECTION_PREVIEW = 120;

export async function hasReport(sessionId: string): Promise<boolean> {
  const existing = await prisma.report.findUnique({ where: { sessionId }, select: { id: true } });
  return existing !== null;
}

/** Answered questions with what the candidate asked the coach about each one. */
async function answeredQuestions(sessionId: string, questions: RuntimeQuestion[]) {
  const coachNotes = await prisma.coachNote.findMany({
    where: { sessionId },
    select: { questionId: true, prompt: true, selection: true, askedBeforeAnswer: true },
  });

  return questions
    .filter((q): q is RuntimeQuestion & { transcript: string } => Boolean(q.transcript))
    .map((q) => {
      const notes = coachNotes.filter((n) => n.questionId === q.id);
      return {
        text: q.text,
        category: q.category,
        transcript: q.transcript,
        score: q.score ?? 50,
        keyStrengths: q.strengths,
        gaps: q.gaps,
        coachAsked: notes.map((n) =>
          n.selection ? `"${n.selection.slice(0, COACH_SELECTION_PREVIEW)}" — ${n.prompt}` : n.prompt,
        ),
        coachedBeforeAnswer: notes.some((n) => n.askedBeforeAnswer),
      };
    });
}

/**
 * Generate the coaching report and store it. The Report row is upserted and
 * the session marked COMPLETED in one transaction, so a retry after a crash
 * converges on a single report.
 */
export async function buildAndSaveReport(
  sessionId: string,
  context: PromptContext,
  questions: RuntimeQuestion[],
  sessions: SessionRepository,
): Promise<CoachingReport> {
  const questionsWithAnswers = await answeredQuestions(sessionId, questions);
  if (questionsWithAnswers.length === 0) throw new AppError("NO_ANSWERS");

  const report = await generateCoachingReport({ ...context, questionsWithAnswers });

  const data = {
    overallScore: report.overallScore,
    technicalScore: report.dimensionScores.technical,
    behavioralScore: report.dimensionScores.behavioral,
    communicationScore: report.dimensionScores.communication,
    strengths: JSON.stringify(report.strengths),
    weaknesses: JSON.stringify(report.areasToImprove),
    studyPlan: JSON.stringify(report.studyPlan),
    summary: JSON.stringify(report),
  };

  await prisma.$transaction([
    prisma.report.upsert({
      where: { sessionId },
      update: data,
      create: { sessionId, ...data },
    }),
    sessions.markCompleted(),
  ]);

  return report;
}
