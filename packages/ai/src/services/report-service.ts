import { prisma } from "@interviewiq/db";
import {
  coachingReportSchema,
  sanitizeReportUrls,
  sanitizeStudyPlanUrls,
  type CoachingReport,
  type CoachNoteView,
} from "@interviewiq/types";
import { isString, parseJsonArray, parseJsonObject } from "../utils/json";
import { toCoachNoteView } from "./coach-service";

export interface ReportQuestionView {
  id: string;
  order: number;
  text: string;
  category: string;
  transcript: string | null;
  score: number | null;
  feedback: string | null;
  strengths: string[];
  gaps: string[];
  coachNotes: CoachNoteView[];
  coachedBeforeAnswer: boolean;
}

export interface ReportSessionView {
  id: string;
  companyName: string;
  jobTitle: string;
  difficulty: string;
  interviewType: string;
  language: string;
  status: string;
  coachEnabled: boolean;
}

export type ReportPayload =
  | { kind: "not_found" }
  | { kind: "not_ready"; status: string }
  | {
      kind: "ready";
      report: CoachingReport;
      session: ReportSessionView;
      questions: ReportQuestionView[];
    };

/** Verdict bands used when the stored JSON report cannot be parsed. */
export function verdictForScore(score: number): CoachingReport["verdict"] {
  if (score >= 80) return "Strong Pass";
  if (score >= 65) return "Lean Pass";
  if (score >= 50) return "Borderline";
  return "No Pass";
}

/**
 * Rebuild a CoachingReport from the typed Report columns. Used only when the
 * full JSON in `summary` is missing or corrupt.
 */
function reportFromColumns(r: {
  overallScore: number;
  technicalScore: number;
  behavioralScore: number;
  communicationScore: number;
  strengths: string;
  weaknesses: string;
  studyPlan: string;
}): CoachingReport {
  return {
    overallScore: r.overallScore,
    verdict: verdictForScore(r.overallScore),
    executiveSummary:
      "The detailed summary could not be loaded. Scores below are from the stored report.",
    dimensionScores: {
      technical: r.technicalScore,
      problemSolving: Math.round((r.technicalScore + r.communicationScore) / 2),
      communication: r.communicationScore,
      behavioral: r.behavioralScore,
    },
    strengths: parseJsonArray<CoachingReport["strengths"][number]>(r.strengths),
    areasToImprove: parseJsonArray<CoachingReport["areasToImprove"][number]>(r.weaknesses),
    studyPlan: sanitizeStudyPlanUrls(parseJsonArray<CoachingReport["studyPlan"][number]>(r.studyPlan)),
    nextInterviewTips: [],
    companyCultureFit: "",
    estimatedRetakeReadiness: 14,
  };
}

/** Load everything the report page needs for one session. */
export async function getReportPayload(sessionId: string): Promise<ReportPayload> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      companyName: true,
      jobTitle: true,
      difficulty: true,
      interviewType: true,
      language: true,
      status: true,
      coachEnabled: true,
      report: true,
      coachNotes: { orderBy: { createdAt: "asc" } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          text: true,
          category: true,
          transcript: true,
          score: true,
          feedback: true,
          strengths: true,
          gaps: true,
        },
      },
    },
  });

  if (!session) return { kind: "not_found" };
  if (!session.report) return { kind: "not_ready", status: session.status };

  // Reports stored before URLs were validated may hold non-https links; null them rather than discard the report.
  const parsed = coachingReportSchema.safeParse(sanitizeReportUrls(parseJsonObject(session.report.summary)));
  const report = parsed.success ? parsed.data : reportFromColumns(session.report);

  const notesByQuestion = new Map<string, CoachNoteView[]>();
  for (const n of session.coachNotes) {
    if (!n.questionId) continue;
    const view = toCoachNoteView(n);
    notesByQuestion.set(n.questionId, [...(notesByQuestion.get(n.questionId) ?? []), view]);
  }

  const questions: ReportQuestionView[] = session.questions
    .filter((q) => q.transcript !== null)
    .map((q, i) => {
      const notes = notesByQuestion.get(q.id) ?? [];
      return {
        id: q.id,
        // Dense display order over answered questions (skipped ones are excluded)
        order: i,
        text: q.text,
        category: q.category,
        transcript: q.transcript,
        score: q.score,
        feedback: q.feedback,
        strengths: parseJsonArray(q.strengths, isString),
        gaps: parseJsonArray(q.gaps, isString),
        coachNotes: notes,
        coachedBeforeAnswer: notes.some((n) => n.askedBeforeAnswer),
      };
    });

  return {
    kind: "ready",
    report,
    session: {
      id: session.id,
      companyName: session.companyName,
      jobTitle: session.jobTitle,
      difficulty: session.difficulty,
      interviewType: session.interviewType,
      language: session.language,
      status: session.status,
      coachEnabled: session.coachEnabled,
    },
    questions,
  };
}
