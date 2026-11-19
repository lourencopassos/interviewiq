import type { CompanyIntelligence } from "@interviewiq/types";

/** Research results for the fictional "Northwind Labs" used in mock mode. */
export const mockCompanyIntel: CompanyIntelligence = {
  companySize: "About 150 employees, 45 in engineering",
  fundingStage: "Series B",
  techStack: ["React", "Next.js", "TypeScript", "GraphQL", "PostgreSQL", "Vercel"],
  engineeringCulture:
    "Small product teams with end-to-end ownership, written design docs for larger changes, and a weekly frontend guild.",
  recentNews: [
    "Launched a self-serve analytics tier for small teams",
    "Opened a second engineering hub in Lisbon",
  ],
  interviewProcess:
    "Recruiter call, a technical conversation about past work, a frontend system design session, and a values interview.",
  knownChallenges: [
    "Keeping a large dashboard fast as data volume grows",
    "Consolidating two older component libraries",
  ],
  values: ["Customer obsession", "Ownership", "Clear writing", "Kindness in review"],
  coachingTip:
    "Bring a concrete example of a performance problem you diagnosed and explain how you measured the result.",
};
