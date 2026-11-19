import { z } from "zod";

/** Shortest job description we will parse (also gates the setup form). */
export const JOB_DESCRIPTION_MIN_LENGTH = 50;

export const parsedJobSchema = z.object({
  jobTitle: z.string(),
  companyName: z.string(),
  seniority: z.enum(["junior", "mid", "senior", "staff"]),
  primarySkills: z.array(z.string()),
  secondarySkills: z.array(z.string()),
  domain: z.string(),
  keyResponsibilities: z.array(z.string()),
  inferredStack: z.array(z.string()),
  interviewFocus: z.array(z.string()),
  companySummary: z.string(),
});

export type ParsedJob = z.infer<typeof parsedJobSchema>;

export const parseJobRequestSchema = z.object({
  jobDescription: z
    .string()
    .min(JOB_DESCRIPTION_MIN_LENGTH, `Job description must be at least ${JOB_DESCRIPTION_MIN_LENGTH} characters`)
    .max(15000),
  /** Anonymous client UUID, used for per-client rate limiting. */
  clientId: z.string().min(1).max(128).optional(),
});

export type ParseJobRequest = z.infer<typeof parseJobRequestSchema>;
