# Phase 1 — Foundation (Week 1)

## Goals

1. Monorepo scaffold: Turborepo + Next.js + Prisma (SQLite) + shared packages
2. Database schema + migrations (Session, Question, Report models)
3. Service layer scaffold in `packages/ai` (client, prompts, services structure)
4. Job input UI + POST /api/parse-job with Claude (JSON extraction)
5. Company research: POST /api/research-company with web_search tool
6. Setup page: full form with job paste, difficulty, type, language selectors
7. Preview card showing parsed role, company, skills

---

## Module 1 — Job Input & Company Intelligence

### What it does

The user pastes a job description (or a URL) and selects configuration options. The system then uses Claude with web search to research the company before generating the interview.

### UI Components

- Large textarea: "Paste the job description here"
- Optional URL field: "Or paste the job posting URL"
- Difficulty selector: Junior / Mid / Senior / Staff
- Interview type selector: Phone Screen / Technical / Behavioral / System Design / Full Loop
- Language toggle: English / Português
- "Analyze Job" CTA button → triggers parsing + company research
- Preview card: shows extracted role, company, top required skills, inferred level

---

### API Route: POST /api/parse-job

Accepts raw job description text. Returns structured extraction + company intelligence.

#### Prompt: Job Description Parser

**System Prompt:**

```
You are an expert technical recruiter and interview strategist. Given a raw job posting,
extract structured information and return ONLY valid JSON matching this schema:

{
  "jobTitle": string,
  "companyName": string,
  "seniority": "junior" | "mid" | "senior" | "staff",
  "primarySkills": string[],       // top 5-8 core technical skills
  "secondarySkills": string[],     // 3-5 nice-to-haves
  "domain": string,                // e.g. "backend", "frontend", "data", "devops"
  "keyResponsibilities": string[], // top 5 from job post
  "inferredStack": string[],       // technologies inferred from context
  "interviewFocus": string[],      // likely interview topics for this role
  "companySummary": string         // leave empty, will be populated by search
}

Do not include markdown formatting. Return ONLY the JSON object.
```

**Notes:**
- Run this first before company research — use output to focus web search queries
- If company name is not found, extract from email domains or references in text
- `inferredStack` should be smart — e.g. if role mentions "millions of users", infer Redis/CDN

---

### API Route: POST /api/research-company

Uses Claude with web_search tool to gather company intelligence. Enriches the parsed job with real context the interviewer will use.

#### Prompt: Company Intelligence Research

**System Prompt:**

```
You are a senior interview coach preparing a candidate for an interview at {companyName}.

Use your web search tool to research the following and return a JSON object:

{
  "companySize": string,
  "fundingStage": string,
  "techStack": string[],           // known technologies used
  "engineeringCulture": string,    // 2-3 sentence summary
  "recentNews": string[],          // last 3-6 months, relevant items
  "interviewProcess": string,      // what candidates report on Glassdoor/Blind
  "knownChallenges": string[],     // technical or product challenges they face
  "values": string[],              // cultural/company values
  "coachingTip": string            // 1 tactical tip for interviewing there
}

Search for: "{companyName} engineering blog", "{companyName} tech stack",
"{companyName} interview process glassdoor", "{companyName} company culture".

Return ONLY valid JSON. Be specific and factual — no hallucinations.
```

**Notes:**
- Combine with parsed job data to create a "company context packet" passed to question generation
- Cache company research results by companyName to avoid redundant API calls per session
- If company is unknown/small, gracefully return nulls and rely on job description signals only

---

## Backend Foundation (packages/ai)

Phase 1 sets up the service layer structure that Phase 2 builds on. Even though the orchestrator isn't needed yet, the foundation matters.

### Claude Client Wrapper

```typescript
// packages/ai/src/client.ts

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Standard call — for prompts that return JSON
export async function callClaude(systemPrompt: string, userMessage: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  return JSON.parse(response.content[0].text);
}

// With web search — for company research
export async function callClaudeWithSearch(systemPrompt: string, userMessage: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    tools: [{ type: "web_search_20250305" }],
  });
  return JSON.parse(extractTextContent(response));
}
```

### Service Layer Scaffold

```
packages/ai/src/
├── client.ts                          # Claude client (above)
├── prompts/
│   ├── job-parser.ts                  # Job Description Parser prompt
│   └── company-research.ts            # Company Intelligence prompt
├── services/
│   ├── interview-orchestrator.ts      # Stub — built in Phase 2
│   ├── audio-pipeline.ts             # Stub — built in Phase 2
│   └── adaptive-engine.ts            # Stub — built in Phase 2
└── cache/
    └── tts-cache.ts                  # Stub — built in Phase 2
```

Phase 1 implements `client.ts` and `prompts/`. The `services/` and `cache/` directories are created as stubs with exported interfaces so Phase 2 has a clear contract to implement.

---

## Implementation Checklist

- [ ] Initialize Turborepo monorepo with `apps/web` (Next.js 14 App Router) and shared packages
- [ ] Set up `packages/db` with Prisma schema (SQLite) — Session, Question, Report models with expanded fields (clientId, currentIndex, strengths/gaps on Question, full SessionStatus enum)
- [ ] Run initial migration
- [ ] Set up `packages/ai` with Claude client wrapper, prompt definitions, and service layer stubs
- [ ] Set up `packages/types` with shared TypeScript interfaces (ParsedJob, CompanyIntelligence, etc.)
- [ ] Set up `packages/ui` with shadcn/ui base components
- [ ] Build Setup page (`/new`) with job description textarea, URL field, selectors
- [ ] Implement POST `/api/parse-job` using Job Description Parser prompt
- [ ] Implement POST `/api/research-company` using Company Intelligence Research prompt
- [ ] Build Preview card component showing parsed role, company, skills
- [ ] Wire up "Analyze Job" button → parse → research → preview flow
- [ ] Add loading states for parsing and research steps (multi-step progress: parsing → researching → ready)
