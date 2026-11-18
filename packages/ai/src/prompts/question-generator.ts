import {
  questionSetSchema,
  type QuestionSet,
  type ParsedJob,
  type CompanyIntelligence,
  type Difficulty,
  type InterviewType,
  type Language,
} from "@interviewiq/types";
import { callClaude } from "../client";
import { languageInstruction } from "./language";
import { recoverWithDefaults } from "./recover";

const QUESTION_COUNT: Record<Difficulty, number> = {
  JUNIOR: 5,
  MID: 6,
  SENIOR: 7,
  STAFF: 8,
};

function buildSystemPrompt(params: {
  companyName: string;
  jobTitle: string;
  difficulty: Difficulty;
  interviewType: InterviewType;
  parsedJob: ParsedJob;
  companyIntel: CompanyIntelligence | null;
  resumeText?: string | null;
  /** Override the difficulty-based count (used per stage in Full Loop mode). */
  questionCount?: number;
  language?: Language;
}): string {
  const { companyName, jobTitle, difficulty, interviewType, parsedJob, companyIntel, resumeText } = params;
  const questionCount = params.questionCount ?? QUESTION_COUNT[difficulty];

  return `You are an expert technical interviewer at ${companyName} for the role of ${jobTitle}.

Seniority level: ${difficulty}. Interview type: ${interviewType}.

Company context: ${parsedJob.companySummary || "No additional context available."}
Primary skills required: ${(parsedJob.primarySkills ?? []).join(", ") || "Not specified"}
Known company tech stack: ${companyIntel?.techStack?.join(", ") || (parsedJob.inferredStack ?? []).join(", ") || "Not specified"}
Engineering culture: ${companyIntel?.engineeringCulture || "Not available"}
Domain: ${parsedJob.domain}
Key responsibilities: ${(parsedJob.keyResponsibilities ?? []).join(", ") || "Not specified"}

Generate a structured interview question set as JSON:

{
  "opening": string,  // warm intro, 1-2 sentences as the interviewer
  "questions": [
    {
      "id": string,                         // unique identifier like "q1", "q2", etc.
      "text": string,                       // the actual question
      "category": string,                   // "technical" | "behavioral" | "system_design" | "culture_fit"
      "targetSkill": string,                // what this tests
      "difficulty": 1-5,
      "expectedDuration": number,           // seconds
      "followUpTriggers": [                 // if answer mentions X, ask Y
        { "trigger": string, "followUp": string }
      ],
      "scoringGuide": {
        "poor": string,                     // what a weak answer looks like
        "good": string,                     // what a solid answer looks like
        "excellent": string                 // what a standout answer looks like
      }
    }
  ],
  "closing": string                         // how interviewer wraps up
}

Generate exactly ${questionCount} questions.

For JUNIOR: Focus on fundamentals and enthusiasm. No trick questions.
For MID: Balance technical depth with behavioral. Test tradeoffs.
For SENIOR: Heavy technical + system thinking. Test ambiguity handling and leadership signals.
For STAFF: Architectural decisions + leadership + navigating ambiguity. No perfect answers.

Match question topics to the specific company context — reference their actual stack.
Never start with "Tell me about yourself" — make the opening question company-specific.
${resumeText ? `
Candidate's resume/CV:
${resumeText}

Use the candidate's background to personalize questions:
- Reference their specific past experience, projects, and companies
- Probe gaps between their background and the job requirements
- Ask them to elaborate on claims or achievements from their CV
- At least 2 questions should directly reference their experience
- Adjust question framing to acknowledge their seniority and domain expertise
` : ""}
${languageInstruction(params.language)}
Return ONLY valid JSON.`;
}

export async function generateQuestionSet(params: {
  companyName: string;
  jobTitle: string;
  difficulty: Difficulty;
  interviewType: InterviewType;
  parsedJob: ParsedJob;
  companyIntel: CompanyIntelligence | null;
  resumeText?: string | null;
  questionCount?: number;
  language?: Language;
}): Promise<QuestionSet> {
  const systemPrompt = buildSystemPrompt(params);
  const userMessage = `Generate interview questions for a ${params.difficulty} ${params.jobTitle} at ${params.companyName}. Interview type: ${params.interviewType}.`;

  const raw = await callClaude(systemPrompt, userMessage);
  const result = questionSetSchema.safeParse(raw);

  if (!result.success) {
    console.error("Question generator validation failed:", result.error.flatten());
    // May legitimately come back with zero questions — the orchestrator treats
    // an empty set as a hard failure and surfaces it to the user.
    return recoverWithDefaults(
      questionSetSchema,
      raw,
      {
        opening: "Welcome! Let's get started with your interview.",
        questions: [],
        closing: "Thank you for your time today.",
      },
      "question-generator",
    );
  }

  return result.data;
}
