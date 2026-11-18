import { prisma } from "@interviewiq/db";
import { companyIntelligenceSchema, type CompanyIntelligence } from "@interviewiq/types";
import { researchCompany } from "../prompts/company-research";
import { parseJsonObject } from "../utils/json";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const EMPTY_INTELLIGENCE: CompanyIntelligence = {
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

/** Only cache research that actually found something — never pin an empty result for a week. */
export function hasIntelligence(intel: CompanyIntelligence): boolean {
  return Boolean(
    intel.companySize ||
      intel.fundingStage ||
      intel.engineeringCulture ||
      intel.interviewProcess ||
      intel.coachingTip ||
      intel.techStack.length ||
      intel.recentNews.length ||
      intel.knownChallenges.length ||
      intel.values.length,
  );
}

/**
 * Company research with a DB-backed cache keyed by normalised company name.
 * Never throws: on any failure the interview proceeds with empty intel.
 */
export async function researchCompanyCached(
  companyName: string,
  jobTitle: string,
  primarySkills: string[],
): Promise<{ intel: CompanyIntelligence; cached: boolean }> {
  const key = companyName.trim().toLowerCase();

  try {
    const cached = await prisma.companyResearch.findUnique({ where: { companyName: key } });
    if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS) {
      const parsed = companyIntelligenceSchema.safeParse(parseJsonObject(cached.data));
      if (parsed.success) return { intel: parsed.data, cached: true };
      // Corrupt row — fall through and refresh it
    }

    const intel = await researchCompany(companyName, jobTitle, primarySkills);

    if (hasIntelligence(intel)) {
      const data = JSON.stringify(intel);
      await prisma.companyResearch.upsert({
        where: { companyName: key },
        update: { data },
        create: { companyName: key, data },
      });
    }

    return { intel, cached: false };
  } catch (error) {
    console.error("Company research failed:", error);
    return { intel: EMPTY_INTELLIGENCE, cached: false };
  }
}
