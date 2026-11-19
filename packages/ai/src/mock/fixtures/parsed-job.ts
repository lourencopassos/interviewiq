import type { ParsedJob } from "@interviewiq/types";

/** Fictional role used by mock mode for every job description. */
export const mockParsedJob: ParsedJob = {
  jobTitle: "Senior Frontend Engineer",
  companyName: "Northwind Labs",
  seniority: "senior",
  primarySkills: ["React", "TypeScript", "Next.js", "Web performance", "Accessibility", "Testing"],
  secondarySkills: ["GraphQL", "Design systems", "Playwright"],
  domain: "frontend",
  keyResponsibilities: [
    "Build and maintain the customer-facing analytics dashboard",
    "Own frontend performance budgets and Core Web Vitals",
    "Evolve the shared component library with design",
    "Mentor engineers and review frontend architecture proposals",
    "Partner with product on scoping and delivery",
  ],
  inferredStack: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Vercel", "GraphQL"],
  interviewFocus: [
    "React rendering and state management",
    "Frontend performance debugging",
    "Component API design",
    "Accessibility",
    "Cross-team collaboration",
  ],
  companySummary: "",
};
