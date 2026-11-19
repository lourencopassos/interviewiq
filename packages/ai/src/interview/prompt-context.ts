import type { Session } from "@interviewiq/db";
import {
  companyIntelligenceSchema,
  parsedJobSchema,
  type CompanyIntelligence,
  type Difficulty,
  type InterviewType,
  type Language,
  type ParsedJob,
} from "@interviewiq/types";
import { parseJsonObject } from "../utils/json";

/** What every interview prompt needs to know about the session, parsed once. */
export interface PromptContext {
  companyName: string;
  jobTitle: string;
  difficulty: Difficulty;
  interviewType: InterviewType;
  language: Language;
  resumeText: string | null;
  parsedJob: ParsedJob;
  companyIntel: CompanyIntelligence | null;
}

export type PromptContextSource = Pick<
  Session,
  | "companyName"
  | "jobTitle"
  | "difficulty"
  | "interviewType"
  | "language"
  | "resumeText"
  | "parsedJob"
  | "companyIntel"
>;

/** A job description the parser never saw (or stored as invalid JSON) still yields a usable context. */
function fallbackJob(session: PromptContextSource): ParsedJob {
  return {
    jobTitle: session.jobTitle,
    companyName: session.companyName,
    seniority: "mid",
    primarySkills: [],
    secondarySkills: [],
    domain: "unknown",
    keyResponsibilities: [],
    inferredStack: [],
    interviewFocus: [],
    companySummary: "",
  };
}

/**
 * Build the prompt parameters shared by the question generator, evaluator,
 * narrator and report generator from a session row. Stored JSON is validated
 * here; anything unparseable degrades to safe defaults instead of failing.
 */
export function buildPromptContext(session: PromptContextSource): PromptContext {
  const job = parsedJobSchema.safeParse(parseJsonObject(session.parsedJob) ?? {});
  const intel = companyIntelligenceSchema.safeParse(parseJsonObject(session.companyIntel));

  return {
    companyName: session.companyName,
    jobTitle: session.jobTitle,
    difficulty: session.difficulty,
    interviewType: session.interviewType,
    language: session.language,
    resumeText: session.resumeText,
    parsedJob: job.success ? job.data : fallbackJob(session),
    companyIntel: intel.success ? intel.data : null,
  };
}
