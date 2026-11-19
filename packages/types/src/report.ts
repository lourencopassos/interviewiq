import { z } from "zod";

/** True for an absolute `https://` URL. Anything else must not become an `href`. */
export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Study-plan resource link: `null` or an absolute https URL (rendered as an href). */
export const resourceUrlSchema = z
  .string()
  .url()
  .refine(isHttpsUrl, { message: "Resource URLs must use https" })
  .nullable();

/**
 * Coerce every study-plan resource `url` that is not an https URL to `null`,
 * so one bad link from the model doesn't fail the whole report. Works on
 * untrusted input (unknown shape) and returns a shallow-copied structure.
 */
export function sanitizeReportUrls(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const report = raw as Record<string, unknown>;
  if (!Array.isArray(report.studyPlan)) return raw;
  return { ...report, studyPlan: sanitizeStudyPlanUrls(report.studyPlan) };
}

export function sanitizeStudyPlanUrls<T>(studyPlan: T[]): T[] {
  return studyPlan.map((item) => {
    if (typeof item !== "object" || item === null) return item;
    const entry = item as Record<string, unknown>;
    if (!Array.isArray(entry.resources)) return item;
    return {
      ...entry,
      resources: entry.resources.map((resource) =>
        typeof resource === "object" && resource !== null
          ? {
              ...(resource as Record<string, unknown>),
              url: isHttpsUrl((resource as Record<string, unknown>).url)
                ? (resource as Record<string, unknown>).url
                : null,
            }
          : resource,
      ),
    } as T;
  });
}

export const studyPlanItemSchema = z.object({
  topic: z.string(),
  whyItMatters: z.string(),
  resources: z.array(
    z.object({
      type: z.enum(["book", "course", "practice", "article"]),
      title: z.string(),
      url: resourceUrlSchema,
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
