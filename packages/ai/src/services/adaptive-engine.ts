import type { AnswerEvaluation } from "@interviewiq/types";

/** The minimum the engine needs to know about a question in the running order. */
export interface AdaptiveQuestion {
  id: string;
  difficulty: number;
  stage: string | null;
  isFollowUp: boolean;
}

export type NextStep =
  | { kind: "complete" }
  | { kind: "followUp"; text: string }
  | { kind: "question"; index: number; skipped: boolean };

export const FOLLOW_UP_THRESHOLD = 65;
export const SKIP_THRESHOLD = 88;

/**
 * Stateless question selection. All inputs come from the DB-backed question
 * list so the result is identical no matter which process handles the request.
 */
export class AdaptiveEngine {
  /**
   * Decide what happens after the answer at `currentIndex` has been scored.
   *
   * - follow-up when the answer was weak and the evaluator proposed one
   *   (never chained: a follow-up to a follow-up is not allowed)
   * - skip one easy question after a very strong answer, but never across a
   *   Full Loop stage boundary
   * - otherwise the next scheduled question, or complete when none remain
   */
  selectNext(
    questions: AdaptiveQuestion[],
    evaluation: AnswerEvaluation,
    currentIndex: number,
  ): NextStep {
    const current = questions[currentIndex];
    const nextIndex = currentIndex + 1;

    const canFollowUp =
      evaluation.followUpNeeded &&
      !!evaluation.followUp &&
      evaluation.score < FOLLOW_UP_THRESHOLD &&
      current !== undefined &&
      !current.isFollowUp;

    if (canFollowUp) {
      return { kind: "followUp", text: evaluation.followUp! };
    }

    if (nextIndex >= questions.length) return { kind: "complete" };

    const next = questions[nextIndex];
    const afterNext = questions[nextIndex + 1];

    const canSkip =
      evaluation.score > SKIP_THRESHOLD &&
      next.difficulty < 3 &&
      current !== undefined &&
      next.stage === current.stage &&
      afterNext !== undefined &&
      afterNext.stage === next.stage;

    if (canSkip) {
      return { kind: "question", index: nextIndex + 1, skipped: true };
    }

    return { kind: "question", index: nextIndex, skipped: false };
  }

  /** Average of all scored answers so far. */
  static runningAverage(scores: Array<number | null | undefined>): number {
    const valid = scores.filter((s): s is number => typeof s === "number");
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }

  /**
   * Signal when the candidate is clearly above/below the selected difficulty.
   * Only meaningful after 3+ answers. Informational — surfaced in the report.
   */
  static difficultyMismatch(
    scores: Array<number | null | undefined>,
  ): "up" | "down" | null {
    const valid = scores.filter((s): s is number => typeof s === "number");
    if (valid.length < 3) return null;
    const avg = AdaptiveEngine.runningAverage(valid);
    if (avg > 90) return "up";
    if (avg < 40) return "down";
    return null;
  }
}
