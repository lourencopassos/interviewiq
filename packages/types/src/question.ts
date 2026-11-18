import { z } from "zod";

export const generatedQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.enum(["technical", "behavioral", "system_design", "culture_fit"]),
  targetSkill: z.string(),
  difficulty: z.number().min(1).max(5),
  expectedDuration: z.number(),
  followUpTriggers: z.array(
    z.object({
      trigger: z.string(),
      followUp: z.string(),
    }),
  ),
  scoringGuide: z.object({
    poor: z.string(),
    good: z.string(),
    excellent: z.string(),
  }),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const questionSetSchema = z.object({
  opening: z.string(),
  questions: z.array(generatedQuestionSchema),
  closing: z.string(),
});

export type QuestionSet = z.infer<typeof questionSetSchema>;
