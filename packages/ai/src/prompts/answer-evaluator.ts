import {
  answerEvaluationSchema,
  type AnswerEvaluation,
  type Difficulty,
  type Language,
} from "@interviewiq/types";
import { callClaude } from "../client";
import { languageInstruction } from "./language";
import { recoverWithDefaults } from "./recover";
import { DATA_ONLY_INSTRUCTION, tagged } from "./untrusted";
import { fallbacksFor } from "../i18n/fallbacks";

function buildSystemPrompt(params: {
  companyName: string;
  jobTitle: string;
  difficulty: Difficulty;
  questionText: string;
  targetSkill: string;
  scoringGuide: { poor: string; good: string; excellent: string };
  hasResume: boolean;
  language?: Language;
}): string {
  const { companyName, jobTitle, difficulty, questionText, targetSkill, scoringGuide, hasResume } = params;

  return `You are a senior interviewer at ${companyName} evaluating a candidate for ${jobTitle} (${difficulty}).

Question asked: ${questionText}
What this question tests: ${targetSkill}

Scoring guide:
- Poor answer: ${scoringGuide.poor}
- Good answer: ${scoringGuide.good}
- Excellent answer: ${scoringGuide.excellent}

Evaluate the candidate's answer (inside <transcript> tags in the user message) and return JSON:

{
  "score": number,                  // 0-100
  "tier": "poor" | "good" | "excellent",
  "shortFeedback": string,          // 1 sentence — shown as transition between questions
  "followUpNeeded": boolean,        // should we ask a follow-up?
  "followUp": string | null,        // if followUpNeeded, the follow-up question
  "keyStrengths": string[],         // what they got right (for final report)
  "gaps": string[]                  // what was missing (for study plan)
}

Be rigorous but fair. Score calibrated to the ${difficulty} difficulty level.
shortFeedback should be natural and conversational — it will be spoken aloud as a transition.
For a self-introduction, evaluate clarity and relevance. A concise overview is sufficient; technical depth, metrics and a detailed project story belong in later questions.
When a follow-up is useful, ask one short question about a choice, observation or gap in this answer. Use the candidate's own example. If they gave no example and the question called for one, invite them to choose one. The scoring guide describes evidence to look for; credit other sound approaches.
${hasResume ? `
The candidate's resume/CV is inside <resume> tags in the user message. Use it to understand references the candidate makes. Score what the question asked and what the candidate said.
` : ""}
${DATA_ONLY_INSTRUCTION}
${languageInstruction(params.language)}
Return ONLY valid JSON.`;
}

export async function evaluateAnswer(params: {
  companyName: string;
  jobTitle: string;
  difficulty: Difficulty;
  questionText: string;
  targetSkill: string;
  scoringGuide: { poor: string; good: string; excellent: string };
  transcript: string;
  resumeText?: string | null;
  language?: Language;
}): Promise<AnswerEvaluation> {
  const { transcript, resumeText, ...promptParams } = params;
  const systemPrompt = buildSystemPrompt({ ...promptParams, hasResume: Boolean(resumeText) });

  const userMessage = [
    resumeText ? tagged("resume", resumeText) : null,
    `Candidate's answer:\n${tagged("transcript", transcript)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const raw = await callClaude(systemPrompt, userMessage);
  const result = answerEvaluationSchema.safeParse(raw);

  if (!result.success) {
    console.error("Answer evaluation validation failed:", result.error.flatten());
    return recoverWithDefaults(
      answerEvaluationSchema,
      raw,
      {
        score: 50,
        tier: "good",
        shortFeedback: fallbacksFor(params.language).evaluatorFeedback,
        followUpNeeded: false,
        followUp: null,
        keyStrengths: [],
        gaps: [],
      },
      "answer-evaluator",
    );
  }

  return result.data;
}
