# InterviewIQ

AI-powered mock interview platform. Users paste a job description, the system researches the company, runs an adaptive audio interview through a real-time orchestration pipeline, and produces scored coaching reports with study plans.

## Architecture Philosophy

The backend is a **real-time orchestrator**, not a simple CRUD API. During an interview, the server coordinates Claude, Whisper, and ElevenLabs through a pipelined architecture that eliminates dead air between questions. The frontend subscribes to Server-Sent Events (SSE) and reacts to events — it never polls or makes sequential fetch chains.

Key architectural decisions:
- **Server-authoritative state**: Interview progress, scores, and current question live on the server. Zustand mirrors for UI reactivity only.
- **TTS pre-fetching**: While the user answers question N, the server pre-generates audio for question N+1. If a follow-up is needed (score < 65), the cache is invalidated and new TTS is generated.
- **SSE event stream**: Single persistent connection per interview session. All state changes flow as typed events.
- **Service layer in packages/ai**: Heavy logic lives in the AI package, not in API routes. Routes are thin controllers.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui (in apps/web), Zustand (UI state only), dark mode only
- **Real-time**: Server-Sent Events (SSE) for interview event streaming
- **Database**: Prisma with PostgreSQL (Docker Compose for local dev)
- **AI**: Anthropic Claude (claude-sonnet) for all prompts + web_search tool
- **Speech-to-Text**: OpenAI Whisper API
- **Text-to-Speech**: ElevenLabs API (eleven_turbo_v2_5)
- **Monorepo**: Turborepo
- **Deployment**: Vercel
- **Language**: TypeScript throughout

## Monorepo Structure

```
interviewiq/
├── apps/
│   └── web/                          # Next.js 15 App Router — frontend + API routes
│       ├── app/
│       │   ├── page.tsx              # Landing (/)
│       │   ├── new/page.tsx          # Setup (/new)
│       │   ├── interview/[id]/page.tsx # Interview (/interview/[id])
│       │   ├── api/
│       │   │   ├── parse-job/        # Job description parsing
│       │   │   ├── research-company/ # Company intelligence (web search)
│       │   │   ├── interview/[id]/
│       │   │   │   ├── stream/       # SSE endpoint (ReadableStream)
│       │   │   │   ├── answer/       # Audio answer submission (FormData)
│       │   │   │   └── start/        # Interview initialization
│       │   │   ├── audio/[blobId]/   # Cached TTS audio serving
│       │   │   └── sessions/         # Session CRUD + [id] detail
│       │   └── layout.tsx
│       ├── components/
│       │   ├── setup/                # Setup page components
│       │   ├── interview/            # Interview page components (SSE-driven)
│       │   └── ui/                   # shadcn/ui base components
│       ├── hooks/                    # Custom React hooks
│       │   ├── useInterviewStream.ts # SSE subscription + useReducer
│       │   ├── useAudioRecorder.ts   # MediaRecorder API wrapper
│       │   ├── useAudioPlayback.ts   # Audio element wrapper
│       │   └── useWebcam.ts          # Webcam MediaStream (video mode)
│       └── lib/
│           ├── stores/               # Zustand stores (UI state only)
│           ├── client-id.ts          # Anonymous user UUID
│           └── utils.ts              # Utility functions
├── packages/
│   ├── db/                           # Prisma schema, client, migrations, seed
│   ├── ai/                           # AI orchestration layer
│   │   └── src/
│   │       ├── client.ts             # Claude client wrapper (callClaude, callClaudeWithSearch)
│   │       ├── prompts/              # All prompt templates
│   │       │   ├── job-parser.ts
│   │       │   ├── company-research.ts
│   │       │   ├── question-generator.ts
│   │       │   ├── answer-evaluator.ts
│   │       │   ├── report-generator.ts     # Phase 3
│   │       │   └── stage-narrator.ts       # Phase 3
│   │       ├── services/
│   │       │   ├── interview-orchestrator.ts  # Full interview pipeline + singleton registry
│   │       │   ├── audio-pipeline.ts          # Whisper STT + ElevenLabs TTS
│   │       │   ├── avatar-pipeline.ts         # D-ID Talks API (video mode)
│   │       │   └── adaptive-engine.ts         # Question selection + difficulty
│   │       ├── cache/
│   │       │   ├── tts-cache.ts               # Pre-fetched audio + blob store
│   │       │   └── avatar-cache.ts            # Pre-fetched avatar video (video mode)
│   │       └── sse/
│   │           └── emitter.ts                 # SSE connection registry (globalThis singleton)
│   ├── types/                        # Shared TypeScript interfaces, enums, and Zod schemas
│   └── ui/                           # shadcn/ui component library
├── docs/                             # Phase docs (implementation reference)
├── turbo.json
├── package.json
└── .env.example
```

## Key Commands

```bash
# Development
pnpm dev                  # Start all apps in dev mode
pnpm build                # Build all packages and apps
pnpm lint                 # Lint all packages

# Database (PostgreSQL via Docker)
pnpm db:up                # Start Postgres container
pnpm db:down              # Stop Postgres container
pnpm db:setup             # Start Postgres + push schema (first time)
pnpm db:push              # Push schema changes
pnpm db:seed              # Seed sample data
pnpm db:studio            # Open Prisma Studio

# Individual apps
pnpm --filter web dev     # Start web app only
pnpm --filter web build   # Build web app only
```

## Environment Variables

```env
# AI
ANTHROPIC_API_KEY=         # Claude API for all prompts + web search
OPENAI_API_KEY=            # Whisper transcription
ELEVENLABS_API_KEY=        # Text-to-speech

# Database
DATABASE_URL=              # Prisma connection string (default: postgresql://interviewiq:interviewiq@localhost:5436/interviewiq)
```

## Coding Conventions

### API Routes (Thin Controllers)
- All API routes in `apps/web/app/api/`
- Use Route Handlers (`route.ts` with GET/POST/PATCH/DELETE exports)
- Routes are **thin controllers** — they validate input and delegate to services in `packages/ai`
- Return `Response.json()` for JSON, `new Response()` for streams
- Validate request body with Zod schemas from `packages/types`

### Service Layer (packages/ai)
- All business logic lives in `packages/ai/src/services/`
- `InterviewOrchestrator` is the central coordinator for interview sessions — stateful per-session instances managed via `getOrCreateOrchestrator(sessionId)` with `globalThis` singleton registry
- `AudioPipeline` handles Whisper STT (OpenAI SDK) + ElevenLabs TTS (raw fetch, no SDK)
- `AdaptiveEngine` tracks running scores, inserts follow-ups (score < 65), skips easy questions (score > 88), detects difficulty mismatch after 3+ answers
- `TTSCache` manages pre-fetched audio with invalidation + in-memory blob store served via `/api/audio/[blobId]`
- `SSEEmitter` (in `packages/ai/src/sse/emitter.ts`) manages `Map<sessionId, ReadableStreamDefaultController>` — `globalThis` singleton
- All AI prompts are defined in `packages/ai/src/prompts/` as parameterized templates with Zod validation + fallback recovery

### Real-Time (SSE)
- Interview page opens a single SSE connection to `/api/interview/[id]/stream`
- All state changes during an interview flow through SSE events
- Frontend uses `useInterviewStream` hook (EventSource + useReducer)
- Event types: `state_change`, `question_ready`, `audio_ready`, `video_ready`, `video_fallback`, `transcription_complete`, `evaluation_complete`, `transition_text`, `interview_complete`, `stage_transition`, `error`

### State Management
- Zustand stores in `apps/web/lib/stores/` — **UI state only**
- Server is authoritative for interview state (session.status, session.currentIndex)
- Zustand mirrors server state via SSE events, never drives it
- If user refreshes mid-interview, state is recovered from server

### Components
- shadcn/ui as base component library in `packages/ui`
- App-specific components in `apps/web/components/`
- Use Tailwind CSS utility classes, no custom CSS files
- Responsive: desktop-first, mobile-functional
- Interview components are **event-reactive** (driven by SSE, not local state)

### Database
- PostgreSQL via Docker Compose (`docker-compose.yml` at root)
- Prisma schema in `packages/db/prisma/schema.prisma`
- Models: Session (with clientId, currentIndex, opening, closing), Question (with metadata, strengths, gaps), Report
- Native Postgres enums: Difficulty, InterviewType, Language, SessionStatus
- Store JSON data as `@db.Text` strings (JSON.stringify/parse) — used for parsedJob, companyIntel, Question.metadata (GeneratedQuestion), strengths, gaps
- Anonymous tracking via client UUID in localStorage (no auth for MVP)
- Run `pnpm db:setup` for first-time setup (starts Docker + pushes schema)

### Singleton Pattern (globalThis)
Server-side singletons survive Next.js hot reload using the `globalThis` pattern (same as Prisma client):
- `globalThis.__sseEmitter` — SSE connection registry
- `globalThis.__orchestrators` — Interview orchestrator instances per session
- `globalThis.__ttsCache` — TTS audio cache (question pre-fetch + blob store)

### AI Prompts
- All prompts return JSON (except Stage Transition Narrator which returns plain text)
- Always include "Return ONLY valid JSON" in system prompts
- Parse AI responses with try/catch and fallback handling
- 6 prompts: Job Description Parser, Company Intelligence Research, Question Set Generator, Per-Answer Evaluator, Holistic Report Generator, Stage Transition Narrator

## Feature Backlog

Feature ideas and roadmap are tracked in [`docs/FEATURES.md`](docs/FEATURES.md). When a feature from this backlog is completed, update its status to `Completed` and add the completion date.

## Phase Docs

Implementation is split into 5 phases — see `docs/` folder:

1. **[phase-1-foundation.md](docs/phase-1-foundation.md)** — Monorepo setup, DB, job parsing, company research, service layer scaffold
2. **[phase-2-interview-engine.md](docs/phase-2-interview-engine.md)** — Orchestrator, audio pipeline, SSE streaming, adaptive engine, TTS cache, interview UI
3. **[phase-3-report-history.md](docs/phase-3-report-history.md)** — Coaching report, session history, Full Loop mode with stage transitions
4. **[phase-4-video-interview.md](docs/phase-4-video-interview.md)** — Google Meet-like video interview with D-ID avatar, webcam self-view
5. **[phase-5-polish-launch.md](docs/phase-5-polish-launch.md)** — Landing page, error handling, mobile, deployment

Each phase doc contains prompts, API specs, service implementations, UI components, and checklists.
