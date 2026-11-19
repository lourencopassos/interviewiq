import { z } from "zod";
import { companyIntelligenceSchema, parsedJobSchema } from "@interviewiq/types";

const jobPrefix = "interviewiq.saved-job.";
export const draftKey = "interviewiq.job-draft";
export const jobSchema = z.object({
  jobDescription: z.string().min(50),
  parsedJob: parsedJobSchema,
  companyIntel: companyIntelligenceSchema.nullable(),
});
export type SavedJob = z.infer<typeof jobSchema> & { key: string };

export function readJobs(): SavedJob[] {
  const jobs: SavedJob[] = [];
  for (const key of Object.keys(localStorage).filter((key) =>
    key.startsWith(jobPrefix),
  )) {
    try {
      const result = jobSchema.safeParse(
        JSON.parse(localStorage.getItem(key) ?? "null"),
      );
      if (result.success) jobs.push({ ...result.data, key });
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err;
    }
  }
  return jobs.sort((a, b) =>
    a.parsedJob.jobTitle.localeCompare(b.parsedJob.jobTitle),
  );
}

export function saveJob(job: z.infer<typeof jobSchema>) {
  const entry = readJobs().find((item) => item.jobDescription === job.jobDescription);
  localStorage.setItem(entry?.key ?? jobPrefix + crypto.randomUUID(), JSON.stringify(jobSchema.parse(job)));
  if (localStorage.getItem(draftKey) === job.jobDescription) localStorage.removeItem(draftKey);
}
