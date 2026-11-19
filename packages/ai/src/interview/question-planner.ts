import { FULL_LOOP_STAGES } from "@interviewiq/types";
import { generateQuestionSet } from "../prompts/question-generator";
import type { PromptContext } from "./prompt-context";
import type { NewQuestion } from "./question-repository";

/** Everything the question generator produced for one interview, ready to persist. */
export interface QuestionPlan {
  questions: NewQuestion[];
  opening: string;
  closing: string;
}

/**
 * Generate the question set for a session. A single-type interview is one
 * generator call; Full Loop runs one call per stage in parallel, caps each at
 * the stage's maximum, and tags every question with its stage.
 */
export async function planQuestions(context: PromptContext): Promise<QuestionPlan> {
  if (context.interviewType !== "FULL_LOOP") {
    const set = await generateQuestionSet(context);
    return {
      questions: set.questions.map((question) => ({ question })),
      opening: set.opening,
      closing: set.closing,
    };
  }

  const stageSets = await Promise.all(
    FULL_LOOP_STAGES.map((stage, index) =>
      generateQuestionSet({
        ...context,
        interviewType: stage.stage,
        continuingStage: index > 0,
        questionCount: stage.questionCount[1],
      }),
    ),
  );

  return {
    questions: FULL_LOOP_STAGES.flatMap((stage, index) =>
      stageSets[index].questions
        .slice(0, stage.questionCount[1])
        .map((question) => ({ question, stage: stage.stage })),
    ),
    opening: stageSets[0].opening,
    closing: stageSets[stageSets.length - 1].closing,
  };
}
