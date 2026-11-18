import { z } from "zod";

export const answerEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  tier: z.enum(["poor", "good", "excellent"]),
  shortFeedback: z.string(),
  followUpNeeded: z.boolean(),
  followUp: z.string().nullable(),
  keyStrengths: z.array(z.string()),
  gaps: z.array(z.string()),
});

export type AnswerEvaluation = z.infer<typeof answerEvaluationSchema>;
