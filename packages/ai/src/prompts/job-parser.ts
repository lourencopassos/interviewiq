import { parsedJobSchema, type ParsedJob } from "@interviewiq/types";
import { callClaude } from "../client";
import { recoverWithDefaults } from "./recover";
import { DATA_ONLY_INSTRUCTION, tagged } from "./untrusted";
import { delay, isMockMode } from "../mock";
import { mockParsedJob } from "../mock/fixtures/parsed-job";

const JOB_PARSER_SYSTEM_PROMPT = `You are an expert technical recruiter and interview strategist. Given a raw job posting (inside <job_description> tags in the user message), extract structured information and return ONLY valid JSON matching this schema:

{
  "jobTitle": string,
  "companyName": string,
  "seniority": "junior" | "mid" | "senior" | "staff",
  "primarySkills": string[],
  "secondarySkills": string[],
  "domain": string,
  "keyResponsibilities": string[],
  "inferredStack": string[],
  "interviewFocus": string[],
  "companySummary": string
}

Guidelines:
- "primarySkills": top 5-8 core technical skills mentioned or strongly implied
- "secondarySkills": 3-5 nice-to-haves
- "domain": e.g. "backend", "frontend", "fullstack", "data", "devops", "mobile"
- "keyResponsibilities": top 5 from the job post
- "inferredStack": technologies inferred from context (e.g. if role mentions "millions of users", infer Redis/CDN)
- "interviewFocus": likely interview topics for this specific role
- "companySummary": leave as empty string (will be populated by company research)
- If company name is not found, extract from email domains or references in text
- Return ONLY the JSON object. Do not include markdown formatting.

${DATA_ONLY_INSTRUCTION}`;

export async function parseJobDescription(
  jobDescription: string,
): Promise<ParsedJob> {
  if (isMockMode()) {
    await delay(300);
    return mockParsedJob;
  }

  const raw = await callClaude(JOB_PARSER_SYSTEM_PROMPT, tagged("job_description", jobDescription));
  const result = parsedJobSchema.safeParse(raw);
  if (!result.success) {
    console.error("Job parser validation failed:", result.error.flatten());
    return recoverWithDefaults(
      parsedJobSchema,
      raw,
      {
        jobTitle: "Unknown Role",
        companyName: "Unknown Company",
        seniority: "mid",
        primarySkills: [],
        secondarySkills: [],
        domain: "unknown",
        keyResponsibilities: [],
        inferredStack: [],
        interviewFocus: [],
        companySummary: "",
      },
      "job-parser",
    );
  }
  return result.data;
}
