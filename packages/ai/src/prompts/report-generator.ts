import {
  coachingReportSchema,
  type CoachingReport,
  type Difficulty,
  type InterviewType,
} from "@interviewiq/types";
import { callClaude } from "../client";
import { recoverWithDefaults } from "./recover";

interface QuestionWithAnswer {
  text: string;
  category: string;
  transcript: string;
  score: number;
  keyStrengths: string[];
  gaps: string[];
}

function buildSystemPrompt(params: {
  companyName: string;
  jobTitle: string;
  difficulty: Difficulty;
  interviewType: InterviewType;
  resumeText?: string | null;
}): string {
  const { companyName, jobTitle, difficulty, interviewType, resumeText } = params;

  return `You are an expert technical interview coach preparing a debrief for a candidate.

Interview context:
- Role: ${jobTitle} at ${companyName}
- Difficulty: ${difficulty}
- Interview type: ${interviewType}

Generate a comprehensive coaching report as JSON:

{
  "overallScore": number,                // weighted 0-100
  "verdict": "Strong Pass" | "Lean Pass" | "Borderline" | "No Pass",
  "executiveSummary": string,            // 3-4 sentences honest overall assessment
  "dimensionScores": {
    "technical": number,
    "problemSolving": number,
    "communication": number,
    "behavioral": number
  },
  "strengths": [
    { "title": string, "detail": string }   // 3-5 genuine strengths
  ],
  "areasToImprove": [
    { "title": string, "detail": string, "priority": "high" | "medium" | "low" }
  ],
  "studyPlan": [
    {
      "topic": string,
      "whyItMatters": string,
      "resources": [
        { "type": "book" | "course" | "practice" | "article", "title": string, "url": string | null }
      ],
      "practicePrompt": string,
      "estimatedHours": number
    }
  ],
  "nextInterviewTips": string[],         // 3-5 tactical tips for the actual interview
  "companyCultureFit": string,           // how well they seem to fit ${companyName} culture
  "estimatedRetakeReadiness": number     // days before retake would be beneficial
}

Be specific, honest, and constructive. Reference actual answer content.
studyPlan should be prioritized — most impactful gaps first.
Resources should be real, well-known references — no hallucinated URLs. Use null for url if unsure.
Score calibrated to the ${difficulty} difficulty level.
${resumeText ? `
Candidate's resume/CV:
${resumeText}

Include in your report:
- How well their interview performance matched their CV claims
- Specific strengths from their background that showed through
- Gaps between stated experience and demonstrated knowledge
- Tailor the study plan to build on their existing experience
` : ""}
Return ONLY valid JSON.`;
}

export async function generateCoachingReport(params: {
  companyName: string;
  jobTitle: string;
  difficulty: Difficulty;
  interviewType: InterviewType;
  questionsWithAnswers: QuestionWithAnswer[];
  resumeText?: string | null;
}): Promise<CoachingReport> {
  const { questionsWithAnswers, ...sessionParams } = params;
  const systemPrompt = buildSystemPrompt(sessionParams);

  const userMessage = `Question + answer transcript pairs:\n\n${questionsWithAnswers
    .map(
      (q, i) =>
        `Question ${i + 1} [${q.category}]: ${q.text}\nAnswer: ${q.transcript}\nScore: ${q.score}/100\nStrengths: ${q.keyStrengths.join(", ") || "None noted"}\nGaps: ${q.gaps.join(", ") || "None noted"}`,
    )
    .join("\n\n---\n\n")}`;

  const raw = await callClaude(systemPrompt, userMessage, { maxTokens: 8192 });
  const result = coachingReportSchema.safeParse(raw);

  if (!result.success) {
    console.error(
      "Report generation validation failed:",
      result.error.flatten(),
    );
    return recoverWithDefaults(coachingReportSchema, raw, {
      overallScore: 50,
      verdict: "Borderline",
      executiveSummary:
        "The interview has been completed. Please review individual question scores for detailed feedback.",
      dimensionScores: {
        technical: 50,
        problemSolving: 50,
        communication: 50,
        behavioral: 50,
      },
      strengths: [],
      areasToImprove: [],
      studyPlan: [],
      nextInterviewTips: [
        "Review your responses and practice articulating your thoughts more clearly.",
      ],
      companyCultureFit:
        "Unable to assess culture fit based on available data.",
      estimatedRetakeReadiness: 14,
    }, "report-generator");
  }

  return result.data;
}
