import {
  companyIntelligenceSchema,
  type CompanyIntelligence,
} from "@interviewiq/types";
import { callClaudeWithSearch } from "../client";
import { recoverWithDefaults } from "./recover";

function getCompanyResearchSystemPrompt(companyName: string): string {
  return `You are a senior interview coach preparing a candidate for an interview at ${companyName}.

Use your web search tool to research the following and return a JSON object:

{
  "companySize": string,
  "fundingStage": string,
  "techStack": string[],
  "engineeringCulture": string,
  "recentNews": string[],
  "interviewProcess": string,
  "knownChallenges": string[],
  "values": string[],
  "coachingTip": string
}

Search for: "${companyName} engineering blog", "${companyName} tech stack", "${companyName} interview process glassdoor", "${companyName} company culture".

Return ONLY valid JSON. Be specific and factual — no hallucinations. If you cannot find information for a field, use null for strings and empty arrays for arrays.`;
}

const EMPTY_INTELLIGENCE: CompanyIntelligence = {
  companySize: null,
  fundingStage: null,
  techStack: [],
  engineeringCulture: null,
  recentNews: [],
  interviewProcess: null,
  knownChallenges: [],
  values: [],
  coachingTip: null,
};

export async function researchCompany(
  companyName: string,
  jobTitle: string,
  primarySkills: string[],
): Promise<CompanyIntelligence> {
  try {
    const systemPrompt = getCompanyResearchSystemPrompt(companyName);
    const userMessage = `Research ${companyName} for a ${jobTitle} position. Key skills: ${primarySkills.join(", ")}`;

    const raw = await callClaudeWithSearch(systemPrompt, userMessage);
    const result = companyIntelligenceSchema.safeParse(raw);

    if (!result.success) {
      console.error(
        "Company research validation failed:",
        result.error.flatten(),
      );
      return recoverWithDefaults(
        companyIntelligenceSchema,
        raw,
        EMPTY_INTELLIGENCE,
        "company-research",
      );
    }

    return result.data;
  } catch (error) {
    console.error("Company research failed:", error);
    // Return empty intelligence rather than failing — interviews can proceed without it
    return EMPTY_INTELLIGENCE;
  }
}
