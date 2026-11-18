import type { Language } from "@interviewiq/types";

const NAMES: Record<Language, string> = {
  EN: "English",
  PT_BR: "Brazilian Portuguese (pt-BR)",
  ES: "Spanish (neutral, Latin American)",
};

export function languageName(language: Language | string | undefined): string {
  return NAMES[(language as Language) ?? "EN"] ?? NAMES.EN;
}

/**
 * Instruction appended to every prompt that produces text the candidate will
 * hear or read. JSON keys and enum values must stay in English so validation
 * keeps working.
 */
export function languageInstruction(language: Language | string | undefined): string {
  const name = languageName(language);
  return `Language: write every human-readable string (openings, questions, feedback, narration, summaries, titles, tips) in ${name}. Keep all JSON keys and enum values exactly as specified, in English.`;
}
