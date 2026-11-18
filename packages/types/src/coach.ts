import { z } from "zod";

export const CoachSource = {
  QUESTION: "question",
  TRANSCRIPT: "transcript",
  FREE: "free",
} as const;
export type CoachSource = (typeof CoachSource)[keyof typeof CoachSource];

/** Body of POST /api/interview/[id]/coach */
export const coachRequestSchema = z
  .object({
    questionId: z.string().min(1).optional(),
    source: z.enum(["question", "transcript", "free"]),
    /** Highlighted text (question or transcript). */
    selection: z.string().trim().min(1).max(2000).optional(),
    /** Free-form question to the coach. */
    prompt: z.string().trim().min(1).max(600).optional(),
  })
  .refine((v) => v.selection || v.prompt, {
    message: "Provide a selection or a prompt",
  });

export type CoachRequest = z.infer<typeof coachRequestSchema>;

export interface CoachNoteView {
  id: string;
  questionId: string | null;
  source: CoachSource;
  selection: string | null;
  prompt: string;
  answer: string;
  askedBeforeAnswer: boolean;
  model: string;
  createdAt: string;
}

/** NDJSON lines streamed back by the coach route. */
export type CoachStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; note: CoachNoteView }
  | { type: "error"; code: string; message: string };
