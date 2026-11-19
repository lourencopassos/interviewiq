import type { GeneratedQuestion } from "@interviewiq/types";

/** Shape we persist in Question.metadata (a GeneratedQuestion plus runtime flags). */
export interface QuestionMeta extends Partial<GeneratedQuestion> {
  isFollowUp?: boolean;
  parentQuestionId?: string;
}

/** Parse Question.metadata; malformed or missing metadata yields `{}`. */
export function parseQuestionMeta(raw: string | null): QuestionMeta {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
