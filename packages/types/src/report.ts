import { z } from "zod";

export const studyPlanItemSchema = z.object({
  topic: z.string(),
  whyItMatters: z.string(),
  resources: z.array(
    z.object({
      type: z.enum(["book", "course", "practice", "article"]),
      title: z.string(),
      url: z.string().nullable(),
    }),
  ),
  practicePrompt: z.string(),
  estimatedHours: z.number(),
});

export type StudyPlanItem = z.infer<typeof studyPlanItemSchema>;

export const coachingReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  verdict: z.enum(["Strong Pass", "Lean Pass", "Borderline", "No Pass"]),
  executiveSummary: z.string(),
  dimensionScores: z.object({
    technical: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    behavioral: z.number().min(0).max(100),
  }),
  strengths: z.array(z.object({ title: z.string(), detail: z.string() })),
  areasToImprove: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ),
  studyPlan: z.array(studyPlanItemSchema),
  nextInterviewTips: z.array(z.string()),
  companyCultureFit: z.string(),
  estimatedRetakeReadiness: z.number(),
});

export type CoachingReport = z.infer<typeof coachingReportSchema>;
