import { z } from "zod";

export const companyIntelligenceSchema = z.object({
  companySize: z.string().nullable().default(null),
  fundingStage: z.string().nullable().default(null),
  techStack: z.array(z.string()).default([]),
  engineeringCulture: z.string().nullable().default(null),
  recentNews: z.array(z.string()).default([]),
  interviewProcess: z.string().nullable().default(null),
  knownChallenges: z.array(z.string()).default([]),
  values: z.array(z.string()).default([]),
  coachingTip: z.string().nullable().default(null),
});

export type CompanyIntelligence = z.infer<typeof companyIntelligenceSchema>;

export const researchCompanyRequestSchema = z.object({
  companyName: z.string().min(1),
  jobTitle: z.string().min(1),
  primarySkills: z.array(z.string()),
  /** Anonymous client UUID, used for per-client rate limiting. */
  clientId: z.string().min(1).max(128).optional(),
});

export type ResearchCompanyRequest = z.infer<typeof researchCompanyRequestSchema>;
