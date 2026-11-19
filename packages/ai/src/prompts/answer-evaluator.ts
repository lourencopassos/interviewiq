import {
  answerEvaluationSchema,
  type AnswerEvaluation,
  type Difficulty,
  type Language,
} from "@interviewiq/types";
import { callClaude } from "../client";
import { languageInstruction } from "./language";
import { recoverWithDefaults } from "./recover";

function buildSystemPrompt(params: {
  companyName: string;
  jobTitle: string;
  difficulty: Difficulty;
  questionText: string;
  targetSkill: string;
  scoringGuide: { poor: string; good: string; excellent: string };
  resumeText?: string | null;
  language?: Language;
}): string {
  const { companyName, jobTitle, difficulty, questionText, targetSkill, scoringGuide, resumeText } = params;

  return `You are a senior interviewer at ${companyName} evaluating a candidate for ${jobTitle} (${difficulty}).

Question asked: ${questionText}
What this question tests: ${targetSkill}

Scoring guide:
- Poor answer: ${scoringGuide.poor}
- Good answer: ${scoringGuide.good}
- Excellent answer: ${scoringGuide.excellent}

Evaluate the candidate's answer and return JSON:

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
${resumeText ? `
Candidate's resume/CV context:
${resumeText}

Use the CV to understand references the candidate makes. Score what the question asked and what the candidate said.
` : ""}
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
  const { transcript, ...promptParams } = params;
  const systemPrompt = buildSystemPrompt(promptParams);

  const raw = await callClaude(systemPrompt, `Candidate's answer (transcript):\n\n${transcript}`);
  const result = answerEvaluationSchema.safeParse(raw);

  if (!result.success) {
    console.error("Answer evaluation validation failed:", result.error.flatten());
    return recoverWithDefaults(
      answerEvaluationSchema,
      raw,
      {
        score: 50,
        tier: "good",
        shortFeedback: "Thank you for your answer. Let's continue.",
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
