import { z } from "zod";

export const Difficulty = {
  JUNIOR: "JUNIOR",
  MID: "MID",
  SENIOR: "SENIOR",
  STAFF: "STAFF",
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const InterviewType = {
  PHONE_SCREEN: "PHONE_SCREEN",
  TECHNICAL: "TECHNICAL",
  BEHAVIORAL: "BEHAVIORAL",
  SYSTEM_DESIGN: "SYSTEM_DESIGN",
  FULL_LOOP: "FULL_LOOP",
} as const;
export type InterviewType = (typeof InterviewType)[keyof typeof InterviewType];

export const Language = {
  EN: "EN",
  PT_BR: "PT_BR",
  ES: "ES",
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export const SessionStatus = {
  SETUP: "SETUP",
  RESEARCHING: "RESEARCHING",
  BRIEFING: "BRIEFING",
  INTERVIEWING: "INTERVIEWING",
  WRAPPING_UP: "WRAPPING_UP",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const InterviewStage = {
  PHONE_SCREEN: "PHONE_SCREEN",
  TECHNICAL: "TECHNICAL",
  BEHAVIORAL: "BEHAVIORAL",
  SYSTEM_DESIGN: "SYSTEM_DESIGN",
} as const;
export type InterviewStage =
  (typeof InterviewStage)[keyof typeof InterviewStage];

export const FULL_LOOP_STAGES = [
  {
    stage: "PHONE_SCREEN" as InterviewStage,
    label: "Phone Screen",
    questionCount: [3, 4] as const,
  },
  {
    stage: "TECHNICAL" as InterviewStage,
    label: "Technical Deep Dive",
    questionCount: [5, 7] as const,
  },
  {
    stage: "BEHAVIORAL" as InterviewStage,
    label: "Behavioral",
    questionCount: [4, 5] as const,
  },
  {
    stage: "SYSTEM_DESIGN" as InterviewStage,
    label: "System Design",
    questionCount: [2, 3] as const,
  },
] as const;

export const createSessionRequestSchema = z.object({
  clientId: z.string().min(1),
  jobTitle: z.string().min(1),
  companyName: z.string().min(1),
  jobDescription: z.string().min(50),
  difficulty: z.enum(["JUNIOR", "MID", "SENIOR", "STAFF"]),
  interviewType: z.enum([
    "PHONE_SCREEN",
    "TECHNICAL",
    "BEHAVIORAL",
    "SYSTEM_DESIGN",
    "FULL_LOOP",
  ]),
  language: z.enum(["EN", "PT_BR", "ES"]),
  videoMode: z.boolean().optional().default(false),
  /** Allow pausing to ask the coach model about a question mid-interview. */
  coachEnabled: z.boolean().optional().default(true),
  resumeText: z.string().max(20000).optional(),
  parsedJob: z.string().optional(),
  companyIntel: z.string().optional(),
});

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;

/** The only client-driven status transition: abandoning an in-progress interview. */
export const updateSessionRequestSchema = z.object({
  clientId: z.string().min(1),
  status: z.literal("ABANDONED"),
});

export type UpdateSessionRequest = z.infer<typeof updateSessionRequestSchema>;
