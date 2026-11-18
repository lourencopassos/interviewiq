# InterviewIQ - Product Overview

AI-Powered Recruitment Coach | MVP v1.0

## 1. Product Overview

InterviewIQ is an AI-powered mock interview platform that lets candidates simulate the full technical recruitment process — from job description parsing to post-interview coaching. The user pastes a job opening, selects difficulty and interview type, and the platform generates a contextual, adaptive audio interview experience. Afterwards, the system provides a scored report with specific study recommendations.

This PRD covers the MVP scope: a fully functional monorepo web application with no authentication, persistent session scoring, and all core interview flows end to end.

### Core Value Proposition

| Dimension | Description |
|---|---|
| **For the User** | Practice real interviews with an AI that actually knows the company and the role — not generic questions. |
| **Key Differentiator** | Company intelligence layer: the system researches the company, culture, and role before generating questions. |
| **Post-interview** | Not just a score — a detailed coaching report with targeted study points and weak area identification. |
| **Multi-stage sim** | Simulate each stage: phone screen → technical → behavioral → system design, all in one flow. |
| **Language Support** | English and Portuguese (BR), targeting Brazilian devs prepping for international roles. |

### Target Users (MVP)

- Brazilian software engineers applying to international or remote-first companies
- Mid-level candidates preparing for senior/staff engineer promotions
- Anyone doing job search prep who wants structured, domain-specific practice
- Future: non-tech roles (sales, PM, design) — architecture supports this from day 1

---

## 2. Technical Architecture

### Architecture Philosophy

The backend is a **real-time orchestrator** — not a simple CRUD API. During an interview, the server coordinates Claude, Whisper, and ElevenLabs in a tight pipeline that must feel like a natural conversation. The key insight: a naive sequential approach (transcribe → evaluate → select next → synthesize) creates 7-12 seconds of dead air between answers. The orchestrator eliminates this through **pipelining, pre-fetching, and event-driven streaming**.

### Monorepo Structure

Single monorepo using Turborepo, with a Next.js frontend and a service layer in shared packages.

```
interviewiq/
├── apps/
│   └── web/                    # Next.js 14 (App Router) — frontend + API routes
├── packages/
│   ├── db/                     # Prisma schema + client (SQLite → Postgres later)
│   ├── ai/                     # AI orchestration layer (see below)
│   │   └── src/
│   │       ├── client.ts       # Claude client wrapper
│   │       ├── prompts/        # All prompt templates
│   │       ├── services/
│   │       │   ├── interview-orchestrator.ts  # Full interview pipeline
│   │       │   ├── audio-pipeline.ts          # Whisper + ElevenLabs coordination
│   │       │   └── adaptive-engine.ts         # Question selection + difficulty
│   │       └── cache/
│   │           └── tts-cache.ts               # Pre-fetched audio management
│   ├── types/                  # Shared TypeScript interfaces
│   └── ui/                     # shadcn/ui components
├── docs/                       # Phase docs (implementation reference)
├── turbo.json
├── package.json
└── .env.example
```

### Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SSR, routing, API routes in one |
| **Styling** | Tailwind CSS + shadcn/ui | Fast, consistent, accessible UI |
| **State** | Zustand | Lightweight, no boilerplate — UI state only |
| **Real-time** | Server-Sent Events (SSE) | Backend pushes interview events to frontend |
| **Database** | SQLite via Prisma (MVP) | Zero config, upgrade path to Postgres |
| **AI Brain** | Anthropic Claude (claude-sonnet) | Context window, instruction following |
| **Speech-to-Text** | OpenAI Whisper API | Best-in-class accuracy |
| **Text-to-Speech** | ElevenLabs API | Natural-sounding interviewer voice |
| **Web Search** | Claude with web_search tool | Company intelligence layer |
| **File storage** | Local /tmp (MVP) | Audio blobs stored briefly |
| **Monorepo** | Turborepo | Build caching, shared packages |
| **Deployment** | Vercel | Zero config, Next.js native |

### Backend Service Layer (`packages/ai`)

The `packages/ai` package is more than prompt definitions — it's the orchestration brain:

| Service | Responsibility |
|---|---|
| **interview-orchestrator.ts** | Manages the full interview pipeline: receives audio, coordinates transcription + evaluation in parallel with TTS pre-fetching, pushes SSE events to frontend |
| **audio-pipeline.ts** | Coordinates Whisper (STT) and ElevenLabs (TTS) calls, handles audio blob management, streams audio responses |
| **adaptive-engine.ts** | Question selection, difficulty adjustment based on running scores, follow-up decision logic |
| **tts-cache.ts** | Pre-generates TTS for upcoming questions during user idle time, invalidates on follow-up swap |

### Real-Time Interview Pipeline

The orchestrator eliminates dead air through pipelining:

```
While user is answering question N:
  ├── Pre-generate TTS for question N+1 (optimistic)
  └── Cache audio blob for instant playback

When user finishes answering:
  ├── Upload audio → Whisper transcription (2-3s)
  ├── In parallel: Claude evaluation starts streaming
  │     ├── If score >= 65 → use pre-cached TTS for N+1 (instant)
  │     └── If score < 65 and follow-up needed → generate new TTS (2-3s)
  └── Push SSE events to frontend as each step completes:
        → { type: "transcription_complete", transcript: "..." }
        → { type: "evaluation_complete", score: 78, tier: "good" }
        → { type: "transition_text", message: "Good point..." }
        → { type: "audio_ready", questionId: "..." }

Result: 0-3s gap instead of 7-12s
```

### Database Schema (Prisma)

```prisma
// packages/db/schema.prisma

model Session {
  id             String        @id @default(cuid())
  createdAt      DateTime      @default(now())
  clientId       String        // anonymous UUID from localStorage
  jobTitle       String
  companyName    String
  jobDescription String
  difficulty     Difficulty
  interviewType  InterviewType
  language       Language
  status         SessionStatus @default(SETUP)
  currentIndex   Int           @default(0) // server-authoritative question index
  questions      Question[]
  report         Report?
}

model Question {
  id         String   @id @default(cuid())
  sessionId  String
  session    Session  @relation(fields: [sessionId], references: [id])
  order      Int
  text       String
  category   String   // "technical" | "behavioral" | "system_design"
  transcript String?  // user answer transcribed
  audioPath  String?  // temp file path for pre-cached TTS
  score      Int?     // 0-100
  feedback   String?  // per-question AI feedback
  strengths  String?  // JSON array — accumulated for report
  gaps       String?  // JSON array — accumulated for report
}

model Report {
  id                 String  @id @default(cuid())
  sessionId          String  @unique
  session            Session @relation(fields: [sessionId], references: [id])
  overallScore       Int
  technicalScore     Int
  behavioralScore    Int
  communicationScore Int
  strengths          String  // JSON array
  weaknesses         String  // JSON array
  studyPlan          String  // JSON array of StudyPoint
  summary            String
}

enum Difficulty { JUNIOR MID SENIOR STAFF }

enum InterviewType { PHONE_SCREEN TECHNICAL BEHAVIORAL SYSTEM_DESIGN FULL_LOOP }

enum Language { EN PT_BR }

enum SessionStatus { SETUP RESEARCHING BRIEFING INTERVIEWING WRAPPING_UP COMPLETED ABANDONED }
```

**Key changes from original schema:**
- `clientId` added to Session for anonymous tracking
- `currentIndex` on Session — server is authoritative on interview progress
- `SessionStatus` expanded to match full state machine (not just IN_PROGRESS/COMPLETED)
- `strengths` and `gaps` on Question — accumulated per-answer for report generation
- `audioPath` on Question — used for TTS pre-cache management

---

## 3. Pages & Navigation

| Route | Page | Purpose |
|---|---|---|
| `/` | Landing | Value prop, CTA, sample report preview |
| `/new` | Setup | Job input, company research, interview config |
| `/interview/[id]` | Interview | Active interview session (SSE-driven audio loop) |
| `/report/[id]` | Report | Post-interview coaching report |
| `/history` | History | Past sessions list + score trends |
| `/report/[id]/export` | Export | Printable/PDF version of report |

---

## 4. Cost Model

### Per-Interview Cost Breakdown

| Service | Usage per Interview | Estimated Cost |
|---|---|---|
| Claude Sonnet (parsing + questions) | ~15k tokens in + 3k out | $0.045 |
| Claude Sonnet (per-answer eval x6) | ~3k tokens each | $0.054 |
| Claude Sonnet (report generation) | ~8k tokens in + 4k out | $0.036 |
| Claude web search (company research) | 3-5 searches | $0.030 |
| Whisper (transcription x6 answers) | ~12 min audio total | $0.072 |
| ElevenLabs TTS (questions + narration) | ~1,800 characters | $0.540 |
| **TOTAL (audio, no video avatar)** | | **$0.78** |
| **TOTAL (with D-ID video avatar, Phase 2)** | | **$1.80** |

### Pricing Strategy

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0/mo | 1 interview/month, basic report, no history |
| **Pro** | $19/mo | 10 interviews, full coaching report, study plan, history |
| **Premium** | $39/mo | Unlimited, full loop mode, video avatar (Phase 2), export PDF |
| **B2B** | Custom | Per-seat for bootcamps, universities, outplacement firms |
