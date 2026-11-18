**INTERVIEWIQ**

AI-Powered Recruitment Coach

Product Requirements Document · MVP v1.0

**1. Product Overview**

InterviewIQ is an AI-powered mock interview platform that lets
candidates simulate the full technical recruitment process --- from job
description parsing to post-interview coaching. The user pastes a job
opening, selects difficulty and interview type, and the platform
generates a contextual, adaptive audio interview experience. Afterwards,
the system provides a scored report with specific study recommendations.

This PRD covers the MVP scope: a fully functional monorepo web
application with no authentication, persistent session scoring, and all
core interview flows end to end.

**1.1 Core Value Proposition**

  --------------------- -------------------------------------------------
  **Dimension**         **Description**

  **For the User**      Practice real interviews with an AI that actually
                        knows the company and the role --- not generic
                        questions.

  **Key                 Company intelligence layer: the system researches
  Differentiator**      the company, culture, and role before generating
                        questions.

  **Post-interview**    Not just a score --- a detailed coaching report
                        with targeted study points and weak area
                        identification.

  **Multi-stage sim**   Simulate each stage: phone screen → technical →
                        behavioral → system design, all in one flow.

  **Language Support**  English and Portuguese (BR), targeting Brazilian
                        devs prepping for international roles.
  --------------------- -------------------------------------------------

**1.2 Target Users (MVP)**

-   Brazilian software engineers applying to international or
    remote-first companies

-   Mid-level candidates preparing for senior/staff engineer promotions

-   Anyone doing job search prep who wants structured, domain-specific
    practice

-   Future: non-tech roles (sales, PM, design) --- architecture supports
    this from day 1

**2. Technical Architecture**

**2.1 Monorepo Structure**

Single monorepo using Turborepo, with two main apps and shared packages.

+-----------------------------------------------------------------------+
| interviewiq/                                                          |
|                                                                       |
| ├── apps/                                                             |
|                                                                       |
| │ ├── web/ \# Next.js 14 frontend (App Router)                        |
|                                                                       |
| │ └── api/ \# NestJS or Next.js API routes                            |
|                                                                       |
| ├── packages/                                                         |
|                                                                       |
| │ ├── db/ \# Prisma schema + client (SQLite → Postgres later)         |
|                                                                       |
| │ ├── ai/ \# All AI prompt definitions & callers                      |
|                                                                       |
| │ ├── types/ \# Shared TypeScript interfaces                          |
|                                                                       |
| │ └── ui/ \# shadcn/ui components                                     |
|                                                                       |
| ├── turbo.json                                                        |
|                                                                       |
| ├── package.json                                                      |
|                                                                       |
| └── .env.example                                                      |
+-----------------------------------------------------------------------+

**2.2 Tech Stack**

  -------------------- --------------------------- --------------------------
  **Layer**            **Tech**                    **Why**

  **Layer**            Technology                  Rationale

  **Frontend**         Next.js 14 (App Router)     SSR, routing, API routes
                                                   in one

  **Styling**          Tailwind CSS + shadcn/ui    Fast, consistent,
                                                   accessible UI

  **State**            Zustand                     Lightweight, no
                                                   boilerplate

  **Database**         SQLite via Prisma (MVP)     Zero config, upgrade path
                                                   to Postgres

  **AI Brain**         Anthropic Claude            Context window,
                       (claude-sonnet)             instruction following

  **Speech-to-Text**   OpenAI Whisper API          Best-in-class accuracy

  **Text-to-Speech**   ElevenLabs API              Natural-sounding
                                                   interviewer voice

  **Web Search**       Claude with web_search tool Company intelligence layer

  **File storage**     Local /tmp (MVP)            Audio blobs stored briefly

  **Monorepo**         Turborepo                   Build caching, shared
                                                   packages

  **Deployment**       Vercel                      Zero config, Next.js
                                                   native
  -------------------- --------------------------- --------------------------

**2.3 Database Schema (Prisma)**

+-----------------------------------------------------------------------+
| // packages/db/schema.prisma                                          |
|                                                                       |
| model Session {                                                       |
|                                                                       |
| id String \@id \@default(cuid())                                      |
|                                                                       |
| createdAt DateTime \@default(now())                                   |
|                                                                       |
| jobTitle String                                                       |
|                                                                       |
| companyName String                                                    |
|                                                                       |
| jobDescription String                                                 |
|                                                                       |
| difficulty Difficulty                                                 |
|                                                                       |
| interviewType InterviewType                                           |
|                                                                       |
| language Language                                                     |
|                                                                       |
| status SessionStatus \@default(IN_PROGRESS)                           |
|                                                                       |
| questions Question\[\]                                                |
|                                                                       |
| report Report?                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| model Question {                                                      |
|                                                                       |
| id String \@id \@default(cuid())                                      |
|                                                                       |
| sessionId String                                                      |
|                                                                       |
| session Session \@relation(fields: \[sessionId\], references: \[id\]) |
|                                                                       |
| order Int                                                             |
|                                                                       |
| text String                                                           |
|                                                                       |
| category String // \"technical\" \| \"behavioral\" \|                 |
| \"system_design\"                                                     |
|                                                                       |
| transcript String? // user answer transcribed                         |
|                                                                       |
| audioPath String? // temp file path                                   |
|                                                                       |
| score Int? // 0-100                                                   |
|                                                                       |
| feedback String? // per-question AI feedback                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| model Report {                                                        |
|                                                                       |
| id String \@id \@default(cuid())                                      |
|                                                                       |
| sessionId String \@unique                                             |
|                                                                       |
| session Session \@relation(fields: \[sessionId\], references: \[id\]) |
|                                                                       |
| overallScore Int                                                      |
|                                                                       |
| technicalScore Int                                                    |
|                                                                       |
| behavioralScore Int                                                   |
|                                                                       |
| communicationScore Int                                                |
|                                                                       |
| strengths String // JSON array                                        |
|                                                                       |
| weaknesses String // JSON array                                       |
|                                                                       |
| studyPlan String // JSON array of StudyPoint                          |
|                                                                       |
| summary String                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| enum Difficulty { JUNIOR MID SENIOR STAFF }                           |
|                                                                       |
| enum InterviewType { PHONE_SCREEN TECHNICAL BEHAVIORAL SYSTEM_DESIGN  |
| FULL_LOOP }                                                           |
|                                                                       |
| enum Language { EN PT_BR }                                            |
|                                                                       |
| enum SessionStatus { IN_PROGRESS COMPLETED ABANDONED }                |
+-----------------------------------------------------------------------+

**3. Feature Modules**

**Module 1 --- Job Input & Company Intelligence**

**3.1 What it does**

The user pastes a job description (or a URL) and selects configuration
options. The system then uses Claude with web search to research the
company before generating the interview.

**3.2 UI Components**

-   Large textarea: \"Paste the job description here\"

-   Optional URL field: \"Or paste the job posting URL\"

-   Difficulty selector: Junior / Mid / Senior / Staff

-   Interview type selector: Phone Screen / Technical / Behavioral /
    System Design / Full Loop

-   Language toggle: English / Português

-   \"Analyze Job\" CTA button → triggers parsing + company research

-   Preview card: shows extracted role, company, top required skills,
    inferred level

**3.3 API Route: POST /api/parse-job**

Accepts raw job description text. Returns structured extraction +
company intelligence.

+-----------------------------------------------------------------------+
| **⚡ PROMPT: Job Description Parser**                                 |
|                                                                       |
| **System Prompt:**                                                    |
|                                                                       |
| You are an expert technical recruiter and interview strategist. Given |
| a raw job posting,                                                    |
|                                                                       |
| extract structured information and return ONLY valid JSON matching    |
| this schema:                                                          |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"jobTitle\": string,                                                 |
|                                                                       |
| \"companyName\": string,                                              |
|                                                                       |
| \"seniority\": \"junior\" \| \"mid\" \| \"senior\" \| \"staff\",      |
|                                                                       |
| \"primarySkills\": string\[\], // top 5-8 core technical skills       |
|                                                                       |
| \"secondarySkills\": string\[\], // 3-5 nice-to-haves                 |
|                                                                       |
| \"domain\": string, // e.g. \"backend\", \"frontend\", \"data\",      |
| \"devops\"                                                            |
|                                                                       |
| \"keyResponsibilities\": string\[\], // top 5 from job post           |
|                                                                       |
| \"inferredStack\": string\[\], // technologies inferred from context  |
|                                                                       |
| \"interviewFocus\": string\[\], // likely interview topics for this   |
| role                                                                  |
|                                                                       |
| \"companySummary\": string // leave empty, will be populated by       |
| search                                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| Do not include markdown formatting. Return ONLY the JSON object.      |
|                                                                       |
| **Notes:**                                                            |
|                                                                       |
| → Run this first before company research --- use output to focus web  |
| search queries                                                        |
|                                                                       |
| → If company name is not found, extract from email domains or         |
| references in text                                                    |
|                                                                       |
| → inferredStack should be smart --- e.g. if role mentions \"millions  |
| of users\", infer Redis/CDN                                           |
+-----------------------------------------------------------------------+

**3.4 API Route: POST /api/research-company**

Uses Claude with web_search tool to gather company intelligence.
Enriches the parsed job with real context the interviewer will use.

+-----------------------------------------------------------------------+
| **⚡ PROMPT: Company Intelligence Research**                          |
|                                                                       |
| **System Prompt:**                                                    |
|                                                                       |
| You are a senior interview coach preparing a candidate for an         |
| interview at {companyName}.                                           |
|                                                                       |
| Use your web search tool to research the following and return a JSON  |
| object:                                                               |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"companySize\": string,                                              |
|                                                                       |
| \"fundingStage\": string,                                             |
|                                                                       |
| \"techStack\": string\[\], // known technologies used                 |
|                                                                       |
| \"engineeringCulture\": string, // 2-3 sentence summary               |
|                                                                       |
| \"recentNews\": string\[\], // last 3-6 months, relevant items        |
|                                                                       |
| \"interviewProcess\": string, // what candidates report on            |
| Glassdoor/Blind                                                       |
|                                                                       |
| \"knownChallenges\": string\[\], // technical or product challenges   |
| they face                                                             |
|                                                                       |
| \"values\": string\[\], // cultural/company values                    |
|                                                                       |
| \"coachingTip\": string // 1 tactical tip for interviewing there      |
|                                                                       |
| }                                                                     |
|                                                                       |
| Search for: \"{companyName} engineering blog\", \"{companyName} tech  |
| stack\",                                                              |
|                                                                       |
| \"{companyName} interview process glassdoor\", \"{companyName}        |
| company culture\".                                                    |
|                                                                       |
| Return ONLY valid JSON. Be specific and factual --- no                |
| hallucinations.                                                       |
|                                                                       |
| **Notes:**                                                            |
|                                                                       |
| → Combine with parsed job data to create a \"company context packet\" |
| passed to question generation                                         |
|                                                                       |
| → Cache company research results by companyName to avoid redundant    |
| API calls per session                                                 |
|                                                                       |
| → If company is unknown/small, gracefully return nulls and rely on    |
| job description signals only                                          |
+-----------------------------------------------------------------------+

**Module 2 --- Interview Session Engine**

**3.5 What it does**

The core of the product. Once setup is complete, the session engine runs
the adaptive interview loop: the AI interviewer speaks a question via
TTS, the user responds via microphone, Whisper transcribes it, Claude
evaluates and decides the next question.

**3.6 Interview Flow State Machine**

+-----------------------------------------------------------------------+
| States:                                                               |
|                                                                       |
| SETUP → user configuring session                                      |
|                                                                       |
| RESEARCHING → company intelligence running (shows progress UI)        |
|                                                                       |
| BRIEFING → show company context preview to user                       |
|                                                                       |
| INTERVIEWING → active audio loop (question → answer → next)           |
|                                                                       |
| TRANSITIONING → brief pause between questions with AI commentary      |
|                                                                       |
| WRAPPING_UP → last question done, starting evaluation                 |
|                                                                       |
| COMPLETE → report ready                                               |
|                                                                       |
| Each state stored in Zustand store + persisted to DB as               |
| session.status                                                        |
+-----------------------------------------------------------------------+

**3.7 API Route: POST /api/generate-questions**

Generates the full interview question set before the session starts.
Questions are stored in DB and served one at a time. Adaptive follow-ups
are generated in-flight.

+-----------------------------------------------------------------------+
| **⚡ PROMPT: Question Set Generator**                                 |
|                                                                       |
| **System Prompt:**                                                    |
|                                                                       |
| You are an expert technical interviewer at {companyName} for the role |
| of {jobTitle}.                                                        |
|                                                                       |
| Seniority level: {difficulty}. Interview type: {interviewType}.       |
|                                                                       |
| Company context: {companySummary}                                     |
|                                                                       |
| Primary skills required: {primarySkills}                              |
|                                                                       |
| Known company tech stack: {companyTechStack}                          |
|                                                                       |
| Generate a structured interview question set as JSON:                 |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"opening\": string, // warm intro, 1-2 sentences as the interviewer  |
|                                                                       |
| \"questions\": \[                                                     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"id\": string,                                                       |
|                                                                       |
| \"text\": string, // the actual question                              |
|                                                                       |
| \"category\": string, // \"technical\" \| \"behavioral\" \|           |
| \"system_design\" \| \"culture_fit\"                                  |
|                                                                       |
| \"targetSkill\": string, // what this tests                           |
|                                                                       |
| \"difficulty\": 1-5,                                                  |
|                                                                       |
| \"expectedDuration\": number, // seconds                              |
|                                                                       |
| \"followUpTriggers\": \[ // if answer mentions X, ask Y               |
|                                                                       |
| { \"trigger\": string, \"followUp\": string }                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"scoringGuide\": {                                                   |
|                                                                       |
| \"poor\": string, // what a weak answer looks like                    |
|                                                                       |
| \"good\": string, // what a solid answer looks like                   |
|                                                                       |
| \"excellent\": string // what a standout answer looks like            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"closing\": string // how interviewer wraps up                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| For JUNIOR: 5 questions, focus on fundamentals and enthusiasm.        |
|                                                                       |
| For MID: 6 questions, balance technical depth with behavioral.        |
|                                                                       |
| For SENIOR: 7 questions, heavy technical + system thinking.           |
|                                                                       |
| For STAFF: 8 questions, architectural decisions + leadership +        |
| ambiguity.                                                            |
|                                                                       |
| Match question topics to the specific company context --- reference   |
| their actual stack.                                                   |
|                                                                       |
| Return ONLY valid JSON.                                               |
|                                                                       |
| **Notes:**                                                            |
|                                                                       |
| → Store full question set + scoringGuide in DB --- needed for         |
| evaluation phase                                                      |
|                                                                       |
| → followUpTriggers enable in-flight adaptive questioning without a    |
| new API call                                                          |
|                                                                       |
| → Never start with \"Tell me about yourself\" --- make opening        |
| question company-specific                                             |
+-----------------------------------------------------------------------+

**3.8 API Route: POST /api/transcribe**

Receives audio blob from browser, sends to Whisper, returns transcript.
Should handle both EN and PT-BR with the language hint.

+-----------------------------------------------------------------------+
| // apps/web/app/api/transcribe/route.ts                               |
|                                                                       |
| export async function POST(req: Request) {                            |
|                                                                       |
| const formData = await req.formData();                                |
|                                                                       |
| const audio = formData.get(\"audio\") as Blob;                        |
|                                                                       |
| const language = formData.get(\"language\") as string; // \"en\" \|   |
| \"pt\"                                                                |
|                                                                       |
| const openai = new OpenAI();                                          |
|                                                                       |
| const transcript = await openai.audio.transcriptions.create({         |
|                                                                       |
| file: new File(\[audio\], \"answer.webm\", { type: \"audio/webm\" }), |
|                                                                       |
| model: \"whisper-1\",                                                 |
|                                                                       |
| language, // improves accuracy significantly                          |
|                                                                       |
| prompt: \"This is a technical interview answer about software         |
| engineering.\",                                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| return Response.json({ transcript: transcript.text });                |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**3.9 API Route: POST /api/synthesize**

Converts AI interviewer text to speech via ElevenLabs. Returns audio URL
for playback.

+-----------------------------------------------------------------------+
| // apps/web/app/api/synthesize/route.ts                               |
|                                                                       |
| const INTERVIEWER_VOICE_ID = \"EXAVITQu4vr4xnSDxMaL\"; // Rachel ---  |
| professional, neutral                                                 |
|                                                                       |
| export async function POST(req: Request) {                            |
|                                                                       |
| const { text, language } = await req.json();                          |
|                                                                       |
| const voiceId = language === \"pt\" ? PT_VOICE_ID :                   |
| INTERVIEWER_VOICE_ID;                                                 |
|                                                                       |
| const audio = await elevenlabs.textToSpeech.convert(voiceId, {        |
|                                                                       |
| text,                                                                 |
|                                                                       |
| model_id: \"eleven_turbo_v2_5\", // lowest latency for real-time      |
|                                                                       |
| voice_settings: { stability: 0.6, similarity_boost: 0.8 },            |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Return as audio/mpeg stream                                        |
|                                                                       |
| return new Response(audio, { headers: { \"Content-Type\":             |
| \"audio/mpeg\" } });                                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**3.10 API Route: POST /api/evaluate-answer**

Called after each answer is transcribed. Scores the answer in context
and optionally generates a follow-up question.

+-----------------------------------------------------------------------+
| **⚡ PROMPT: Per-Answer Evaluator**                                   |
|                                                                       |
| **System Prompt:**                                                    |
|                                                                       |
| You are a senior interviewer at {companyName} evaluating a candidate  |
| for {jobTitle} ({difficulty}).                                        |
|                                                                       |
| Question asked: {questionText}                                        |
|                                                                       |
| What this question tests: {targetSkill}                               |
|                                                                       |
| Scoring guide:                                                        |
|                                                                       |
| \- Poor answer: {scoringGuide.poor}                                   |
|                                                                       |
| \- Good answer: {scoringGuide.good}                                   |
|                                                                       |
| \- Excellent answer: {scoringGuide.excellent}                         |
|                                                                       |
| Candidate\'s answer (transcript): {transcript}                        |
|                                                                       |
| Evaluate and return JSON:                                             |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"score\": number, // 0-100                                           |
|                                                                       |
| \"tier\": \"poor\" \| \"good\" \| \"excellent\",                      |
|                                                                       |
| \"shortFeedback\": string, // 1 sentence, internal, not shown to user |
| yet                                                                   |
|                                                                       |
| \"followUpNeeded\": boolean, // should we ask a follow-up?            |
|                                                                       |
| \"followUp\": string \| null, // if followUpNeeded, the follow-up     |
| question                                                              |
|                                                                       |
| \"keyStrengths\": string\[\], // what they got right (for final       |
| report)                                                               |
|                                                                       |
| \"gaps\": string\[\] // what was missing (for study plan)             |
|                                                                       |
| }                                                                     |
|                                                                       |
| Be rigorous but fair. Score calibrated to the difficulty level.       |
|                                                                       |
| followUp should dig deeper into gaps or test edge case knowledge.     |
|                                                                       |
| Return ONLY valid JSON.                                               |
|                                                                       |
| **Notes:**                                                            |
|                                                                       |
| → This runs in background during user answer --- pre-fetch next TTS   |
| while evaluating                                                      |
|                                                                       |
| → followUp replaces next scheduled question only if score \< 60 and   |
| it is not the last question                                           |
|                                                                       |
| → keyStrengths and gaps are accumulated across all questions for the  |
| final report                                                          |
+-----------------------------------------------------------------------+

**3.11 Interview UI Components**

-   InterviewHeader --- shows company, role, difficulty badge, timer,
    question counter

-   QuestionCard --- displays question text with fade-in, category chip,
    estimated time

-   AudioWaveform --- animated waveform while AI speaks or user records
    (react-audio-waveform)

-   RecordButton --- hold to record / tap to stop, with visual RMS meter

-   TranscriptPreview --- shows live transcription after each answer

-   ProgressBar --- interview completion (e.g. \"4 of 7 questions\")

-   TransitionCard --- brief AI commentary between questions (\"Good
    point. Let\'s dig into\...\")

**Module 3 --- Evaluation & Coaching Report**

**3.12 What it does**

After all questions are complete, the system runs a holistic evaluation
across all answers. It produces a scored coaching report with specific,
actionable study recommendations --- not just a scorecard.

**3.13 API Route: POST /api/generate-report**

+-----------------------------------------------------------------------+
| **⚡ PROMPT: Holistic Report Generator**                              |
|                                                                       |
| **System Prompt:**                                                    |
|                                                                       |
| You are an expert technical interview coach preparing a debrief for a |
| candidate.                                                            |
|                                                                       |
| Interview context:                                                    |
|                                                                       |
| \- Role: {jobTitle} at {companyName}                                  |
|                                                                       |
| \- Difficulty: {difficulty}                                           |
|                                                                       |
| \- Interview type: {interviewType}                                    |
|                                                                       |
| Question + answer transcript pairs:                                   |
|                                                                       |
| {questionsWithAnswers} // \[{question, transcript, score, gaps,       |
| keyStrengths}\]                                                       |
|                                                                       |
| Generate a comprehensive coaching report as JSON:                     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"overallScore\": number, // weighted 0-100                           |
|                                                                       |
| \"verdict\": string, // \"Strong Pass\" \| \"Lean Pass\" \|           |
| \"Borderline\" \| \"No Pass\"                                         |
|                                                                       |
| \"executiveSummary\": string, // 3-4 sentences honest overall         |
| assessment                                                            |
|                                                                       |
| \"dimensionScores\": {                                                |
|                                                                       |
| \"technical\": number,                                                |
|                                                                       |
| \"problemSolving\": number,                                           |
|                                                                       |
| \"communication\": number,                                            |
|                                                                       |
| \"behavioral\": number // if applicable                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"strengths\": \[                                                     |
|                                                                       |
| { \"title\": string, \"detail\": string } // 3-5 genuine strengths    |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"areasToImprove\": \[                                                |
|                                                                       |
| { \"title\": string, \"detail\": string, \"priority\":                |
| \"high\"\|\"medium\"\|\"low\" }                                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"studyPlan\": \[                                                     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"topic\": string, // e.g. \"Distributed Systems Consistency\"        |
|                                                                       |
| \"whyItMatters\": string, // specific to this role/company            |
|                                                                       |
| \"resources\": \[                                                     |
|                                                                       |
| { \"type\": \"book\"\|\"course\"\|\"practice\"\|\"article\",          |
| \"title\": string, \"url\": string\|null }                            |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"practicePrompt\": string, // specific thing to practice             |
|                                                                       |
| \"estimatedHours\": number                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"nextInterviewTips\": string\[\], // 3-5 tactical tips for the       |
| actual interview                                                      |
|                                                                       |
| \"companyCultureFit\": string, // how well they seem to fit           |
| {companyName} culture                                                 |
|                                                                       |
| \"estimatedRetakeReadiness\": number // days before retake would be   |
| beneficial                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| Be specific, honest, and constructive. Reference actual answer        |
| content.                                                              |
|                                                                       |
| studyPlan should be prioritized --- most impactful gaps first.        |
|                                                                       |
| Return ONLY valid JSON.                                               |
|                                                                       |
| **Notes:**                                                            |
|                                                                       |
| → estimatedRetakeReadiness drives the \"Practice Again\" CTA timing   |
| suggestion                                                            |
|                                                                       |
| → Resources should be real, well-known references --- no hallucinated |
| URLs                                                                  |
|                                                                       |
| → For PT-BR language sessions, resource titles can mix EN/PT as       |
| appropriate                                                           |
+-----------------------------------------------------------------------+

**3.14 Report UI**

-   Score dashboard --- circular score gauges for overall + each
    dimension

-   Verdict banner --- color coded (green/yellow/orange/red) with
    verdict label

-   Executive summary --- prose card at top

-   Strengths / Areas to Improve --- side by side cards

-   Study Plan --- expandable accordion per topic, with resources and
    practice prompt

-   Per-question review --- expandable list, shows question, transcript,
    score, feedback

-   Next Tips panel --- quick wins for the actual interview

-   Action buttons --- \"Practice Again\" (new session same role),
    \"Export PDF\", \"Share Link\"

**Module 4 --- Session History & Score Persistence**

**3.15 What it does**

No auth required for MVP. Sessions are tracked by a random UUID stored
in localStorage. Users can view past sessions, compare scores, and
retake interviews. Score trends visible over time.

**3.16 Session List Page**

-   Grid of past session cards: company logo (via Clearbit), role, date,
    score badge

-   Filter by: date range, difficulty, interview type

-   Score sparkline per session showing trend over time

-   Quick actions: View Report, Retake, Delete

**3.17 API Routes**

  ------------------------------ --------------------------- --------------------------
  **Route**                      **Method**                  **Purpose**

  **Route**                      Method                      Purpose

  **/api/sessions**              GET                         List all sessions by
                                                             clientId (from
                                                             localStorage UUID)

  **/api/sessions/:id**          GET                         Get single session with
                                                             questions + report

  **/api/sessions/:id**          PATCH                       Update session status

  **/api/sessions/:id**          DELETE                      Soft delete session

  **/api/sessions/:id/report**   GET                         Get report for session

  **/api/export/:id**            GET                         Export report as PDF
                                                             (html-pdf or puppeteer)
  ------------------------------ --------------------------- --------------------------

**3.18 Anonymous Session Tracking**

+-----------------------------------------------------------------------+
| // Client-side session identification (no auth)                       |
|                                                                       |
| // apps/web/lib/client-id.ts                                          |
|                                                                       |
| export function getClientId(): string {                               |
|                                                                       |
| if (typeof window === \"undefined\") return \"\";                     |
|                                                                       |
| const existing = localStorage.getItem(\"interviewiq_client_id\");     |
|                                                                       |
| if (existing) return existing;                                        |
|                                                                       |
| const newId = crypto.randomUUID();                                    |
|                                                                       |
| localStorage.setItem(\"interviewiq_client_id\", newId);               |
|                                                                       |
| return newId;                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Attach as header to all API calls                                  |
|                                                                       |
| // X-Client-ID: {uuid}                                                |
+-----------------------------------------------------------------------+

**Module 5 --- Multi-Stage Interview Mode**

**3.19 What it does**

\"Full Loop\" mode simulates the complete recruitment process in one
session: a phone screen, followed by a technical round, a behavioral
round, and optionally a system design round. Each stage has a separate
AI evaluator and produces separate scores that roll up to a final hiring
recommendation.

**3.20 Stage Configuration**

  ---------------- --------------------------- --------------------------
  **Stage**        **Duration**                **Focus**

  **Stage**        Duration                    Focus

  **Phone Screen** \~10 min / 3-4 questions    Culture fit, background,
                                               basic technical bar

  **Technical**    \~20 min / 5-7 questions    Core skills, coding
                                               approaches, depth of
                                               knowledge

  **Behavioral**   \~15 min / 4-5 questions    STAR method, leadership,
                                               conflict, decision making

  **System         \~20 min / 2-3 questions    Architecture, tradeoffs,
  Design**                                     scalability thinking
  ---------------- --------------------------- --------------------------

+-----------------------------------------------------------------------+
| **⚡ PROMPT: Stage Transition Narrator**                              |
|                                                                       |
| **System Prompt:**                                                    |
|                                                                       |
| You are the AI coordinator of a full-loop interview simulation.       |
|                                                                       |
| The candidate just completed the {previousStage} stage with a score   |
| of {stageScore}/100.                                                  |
|                                                                       |
| Write a brief, natural transition message (2-3 sentences) that:       |
|                                                                       |
| 1\. Acknowledges completion of the previous stage naturally           |
|                                                                       |
| 2\. Sets expectations for the next stage: {nextStage}                 |
|                                                                       |
| 3\. Gives one brief tip relevant to the upcoming stage                |
|                                                                       |
| Tone: professional but warm, like a real recruiter would speak.       |
|                                                                       |
| Do NOT reveal individual question scores. Keep it motivating.         |
|                                                                       |
| Return plain text, no JSON needed.                                    |
|                                                                       |
| **Notes:**                                                            |
|                                                                       |
| → This is spoken aloud via TTS between stages --- keep it to 30-45    |
| seconds when read aloud                                               |
|                                                                       |
| → Store stage scores separately in DB for granular reporting          |
+-----------------------------------------------------------------------+

**Module 6 --- Difficulty & Adaptive Intelligence**

**3.21 Difficulty Calibration**

Difficulty affects not just question complexity but also evaluation
rigor, follow-up depth, and passing thresholds. The system tracks answer
quality in real-time and can auto-adjust if the candidate is clearly
above or below the selected level.

  ---------------- --------------------------- --------------------------
  **Level**        **Pass Threshold**          **Notes**

  **Level**        Score to Pass               Key Characteristics

  **Junior**       ≥ 60                        Fundamentals, enthusiasm
                                               rewarded, no trick
                                               questions

  **Mid**          ≥ 70                        Depth expected, breadth
                                               tested, tradeoffs matter

  **Senior**       ≥ 75                        System thinking required,
                                               ambiguity handled,
                                               leadership signals

  **Staff**        ≥ 80                        Org-level thinking,
                                               multiple constraints, no
                                               perfect answers
  ---------------- --------------------------- --------------------------

**3.22 Adaptive Follow-Up Logic**

+-----------------------------------------------------------------------+
| // Adaptive question selection logic                                  |
|                                                                       |
| // packages/ai/src/adaptive.ts                                        |
|                                                                       |
| function selectNextQuestion(                                          |
|                                                                       |
| scheduledQuestions: Question\[\],                                     |
|                                                                       |
| lastAnswerScore: number,                                              |
|                                                                       |
| lastAnswerGaps: string\[\],                                           |
|                                                                       |
| followUpFromEvaluator: string \| null,                                |
|                                                                       |
| questionIndex: number                                                 |
|                                                                       |
| ): Question \| string {                                               |
|                                                                       |
| // If evaluator generated a follow-up and score was weak              |
|                                                                       |
| if (followUpFromEvaluator && lastAnswerScore \< 65) {                 |
|                                                                       |
| return followUpFromEvaluator; // use AI-generated follow-up           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // If candidate is scoring very high, optionally skip easier          |
| questions                                                             |
|                                                                       |
| if (lastAnswerScore \> 88 &&                                          |
| scheduledQuestions\[questionIndex\]?.difficulty \< 3) {               |
|                                                                       |
| return scheduledQuestions\[questionIndex + 1\] ??                     |
| scheduledQuestions\[questionIndex\];                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| return scheduledQuestions\[questionIndex\];                           |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**4. Pages & Navigation**

  --------------------------- --------------------------- --------------------------
  **Route**                   **Page**                    **Purpose**

  **Route**                   Page                        Purpose

  **/**                       Landing                     Value prop, CTA, sample
                                                          report preview

  **/new**                    Setup                       Job input, company
                                                          research, interview config

  **/interview/\[id\]**       Interview                   Active interview session
                                                          (audio loop)

  **/report/\[id\]**          Report                      Post-interview coaching
                                                          report

  **/history**                History                     Past sessions list + score
                                                          trends

  **/report/\[id\]/export**   Export                      Printable/PDF version of
                                                          report
  --------------------------- --------------------------- --------------------------

**5. Cost Model**

**5.1 Per-Interview Cost Breakdown**

  ---------------- --------------------------- --------------------------
  **Service**      **Usage**                   **Cost**

  **Service**      Usage per Interview         Estimated Cost

  **Claude Sonnet  \~15k tokens in + 3k out    \$0.045
  (parsing +                                   
  questions)**                                 

  **Claude Sonnet  \~3k tokens each            \$0.054
  (per-answer eval                             
  x6)**                                        

  **Claude Sonnet  \~8k tokens in + 4k out     \$0.036
  (report                                      
  generation)**                                

  **Claude web     3-5 searches                \$0.030
  search (company                              
  research)**                                  

  **Whisper        \~12 min audio total        \$0.072
  (transcription                               
  x6 answers)**                                

  **ElevenLabs TTS \~1,800 characters          \$0.540
  (questions +                                 
  narration)**                                 

  **TOTAL (audio,                              \$0.78
  no video                                     
  avatar)**                                    

  **TOTAL (with                                \$1.80
  D-ID video                                   
  avatar, Phase                                
  2)**                                         
  ---------------- --------------------------- --------------------------

**5.2 Pricing Strategy**

  ---------------- --------------------------- --------------------------
  **Tier**         **Price**                   **Includes**

  **Tier**         Price                       Includes

  **Free**         \$0/mo                      1 interview/month, basic
                                               report, no history

  **Pro**          \$19/mo                     10 interviews, full
                                               coaching report, study
                                               plan, history

  **Premium**      \$39/mo                     Unlimited, full loop mode,
                                               video avatar (Phase 2),
                                               export PDF

  **B2B**          Custom                      Per-seat for bootcamps,
                                               universities, outplacement
                                               firms
  ---------------- --------------------------- --------------------------

**6. Build Plan & Milestones**

**Week 1 --- Foundation**

1.  Monorepo scaffold: Turborepo + Next.js + Prisma (SQLite) + shared
    packages

2.  Database schema + migrations (Session, Question, Report models)

3.  Job input UI + POST /api/parse-job with Claude (JSON extraction)

4.  Company research: POST /api/research-company with web_search tool

5.  Setup page: full form with job paste, difficulty, type, language
    selectors

6.  Preview card showing parsed role, company, skills

**Week 2 --- Core Interview Engine**

7.  Question generation: POST /api/generate-questions → store in DB

8.  Audio recorder component (browser MediaRecorder API)

9.  Whisper transcription: POST /api/transcribe

10. ElevenLabs TTS: POST /api/synthesize + audio playback component

11. Interview page state machine (Zustand) with full question loop

12. Per-answer evaluation: POST /api/evaluate-answer → adaptive
    follow-up logic

**Week 3 --- Report & History**

13. Report generation: POST /api/generate-report → comprehensive
    coaching output

14. Report page: score gauges, strengths, study plan, per-question
    review

15. Session history page with clientId-based anonymous tracking

16. PDF export route (html-to-pdf or Puppeteer)

17. Full Loop mode: stage transitions + stage-level scoring

**Week 4 --- Polish & Launch**

18. Landing page with demo report preview and value prop

19. Loading states, error boundaries, retry logic throughout

20. Mobile-responsive layout passes (primary: desktop, functional:
    mobile)

21. Rate limiting on API routes (Upstash Redis or in-memory for MVP)

22. Deploy to Vercel, seed with sample session data for demo mode

23. Soft launch post in dev communities: Twitter/X, LinkedIn,
    Rocketseat, Discord

**7. Phase Roadmap**

**Phase 1 --- MVP (This Build)**

-   Audio-based interview with company intelligence

-   Adaptive question engine (Junior → Staff)

-   Holistic coaching report with study plan

-   Anonymous session history + score persistence

-   Multi-stage Full Loop mode

-   EN + PT-BR support

**Phase 2 --- Video & Auth (Month 2-3)**

-   AI video avatar interviewer via D-ID or HeyGen

-   User accounts (Clerk or NextAuth)

-   Progress tracking across sessions (skill improvement curves)

-   Comparison to \"ideal\" candidate benchmark per role

-   Interview recording playback (user sees themselves)

**Phase 3 --- Scale & B2B (Month 4-6)**

-   LinkedIn job URL import (auto-parse from post)

-   Chrome extension for one-click interview from any job board

-   B2B portal: bootcamp/company bulk seat purchasing

-   Custom interviewer personas (e.g. \"Google-style\",
    \"startup-style\")

-   Mobile app (React Native)

-   Community features: share scores, interview tips, company-specific
    prep forums

**8. Prompt Engineering Reference**

All prompts live in packages/ai/src/prompts/. Each prompt is a typed
function taking a context object and returning the final string. This
keeps prompts versioned, testable, and separated from API route logic.

+-----------------------------------------------------------------------+
| // packages/ai/src/prompts/index.ts                                   |
|                                                                       |
| export { buildParserPrompt } from \"./parser\";                       |
|                                                                       |
| export { buildCompanyResearchPrompt } from \"./company-research\";    |
|                                                                       |
| export { buildQuestionGeneratorPrompt } from                          |
| \"./question-generator\";                                             |
|                                                                       |
| export { buildAnswerEvaluatorPrompt } from \"./answer-evaluator\";    |
|                                                                       |
| export { buildReportGeneratorPrompt } from \"./report-generator\";    |
|                                                                       |
| export { buildStageTransitionPrompt } from \"./stage-transition\";    |
+-----------------------------------------------------------------------+

  ----------------------------------------- -------------------------------------------------
  **Prompt Function**                       **Purpose**

  **buildParserPrompt(jobText)**            Extracts structured job data from raw paste

  **buildCompanyResearchPrompt(company)**   Web search agent for company intelligence

  **buildQuestionGeneratorPrompt(ctx)**     Generates full question set with scoring guides

  **buildAnswerEvaluatorPrompt(ctx)**       Scores individual answer + follow-up decision

  **buildReportGeneratorPrompt(ctx)**       Holistic post-interview coaching report

  **buildStageTransitionPrompt(ctx)**       Natural narrator between Full Loop stages
  ----------------------------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| **💡 Prompt Engineering Best Practices**                              |
|                                                                       |
| → Always specify output format as JSON at the top AND bottom of the   |
| prompt                                                                |
|                                                                       |
| → Include \"Return ONLY valid JSON, no markdown, no preamble\" as     |
| final line                                                            |
|                                                                       |
| → Inject dynamic company/role context into the \"persona\" part of    |
| every prompt                                                          |
|                                                                       |
| → Use scoringGuide in evaluation prompts to anchor scores --- reduces |
| hallucinated numbers                                                  |
|                                                                       |
| → For TTS content, write as if the AI is actually speaking ---        |
| contractions, natural rhythm                                          |
|                                                                       |
| → Test all prompts with edge cases: unknown company, vague job        |
| description, very short answers                                       |
+-----------------------------------------------------------------------+

InterviewIQ · PRD v1.0 · Confidential
