import type { Language } from "@interviewiq/types";
import { languageInstruction } from "./language";

interface CoachContext {
  companyName: string;
  jobTitle: string;
  difficulty: string;
  language?: Language;
  question: { text: string; category: string; targetSkill: string } | null;
  transcript: string | null;
  priorNotes: Array<{ prompt: string; answer: string }>;
}

export function buildCoachSystemPrompt(ctx: CoachContext): string {
  const question = ctx.question
    ? `Current interview question (${ctx.question.category}, tests: ${ctx.question.targetSkill}):\n"${ctx.question.text}"`
    : "No specific question is active.";

  const transcript = ctx.transcript
    ? `The candidate already answered this question. Their transcript:\n"${ctx.transcript}"`
    : "The candidate has NOT answered this question yet.";

  const prior = ctx.priorNotes.length
    ? `Earlier in this session the candidate asked you:\n${ctx.priorNotes
        .slice(-3)
        .map((n) => `- Q: ${n.prompt}\n  A: ${n.answer.slice(0, 300)}`)
        .join("\n")}`
    : "";

  return `You are a calm, expert interview coach sitting next to a candidate during a PAUSED mock interview for the role of ${ctx.jobTitle} at ${ctx.companyName} (level: ${ctx.difficulty}).

${question}

${transcript}

${prior}

The candidate highlighted some text or asked a question. Your job:
- Explain the concept or what the interviewer is really probing for, in 3 to 6 short paragraphs or a tight list. Be concrete; prefer one good example over three vague ones.
- If they have not answered yet, do NOT write a model answer for them. Give them the mental model and the two or three points a strong answer would hit, so they can say it in their own words.
- If they already answered, compare what they said with what was expected and name the single most valuable thing to add or fix.
- No preamble, no praise padding, no "great question". Plain language. Markdown is fine (short headings, bullets, inline code), no tables.
${languageInstruction(ctx.language)}`;
}

export function buildCoachUserMessage(params: {
  source: "question" | "transcript" | "free";
  selection?: string;
  prompt?: string;
}): string {
  const parts: string[] = [];
  if (params.selection) {
    const label =
      params.source === "transcript"
        ? "Highlighted from my own answer"
        : "Highlighted from the question";
    parts.push(`${label}:\n"${params.selection}"`);
  }
  if (params.prompt) parts.push(`My question: ${params.prompt}`);
  if (!params.prompt) parts.push("Explain this to me.");
  return parts.join("\n\n");
}
