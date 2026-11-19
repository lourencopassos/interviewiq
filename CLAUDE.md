# InterviewIQ

Self-hosted, bring-your-own-keys AI mock interviewer. The user pastes a job description; the app parses it, researches the company, runs an adaptive voice interview (optionally with a D-ID video avatar), and produces a scored coaching report with a study plan.

**[ARCHITECTURE.md](ARCHITECTURE.md) is authoritative** for how the system works. `docs/history/` holds planning-era documents (PRD, phase guides, agent reference): useful background, but they may not match the code. Setup and operator docs are in [README.md](README.md).

## Shape of the system

- **One long-lived Node process on localhost** (or behind the operator's own auth proxy) plus Postgres in Docker. Not serverless, not multi-instance: the SSE registry, TTS cache, rate limiter and orchestrator locks live in process memory. No Vercel target.
- **No authentication.** An anonymous client id (localStorage, mirrored to a cookie) owns each session; `[id]` routes check ownership; middleware rejects cross-site `/api/*` requests.
- **Real-time orchestrator, not CRUD.** During an interview the server coordinates Claude, Whisper and ElevenLabs and pushes typed events over one SSE connection per session.
- **Server-authoritative state.** Interview progress lives in Postgres (`Session.status`, `currentIndex`, ordered `Question` rows). Zustand holds UI state only. A refresh recovers from the server.
- **TTS pre-fetch.** While the user answers question N, audio for N+1 is generated. If the adaptive engine inserts a follow-up (score < 65), the cached clip is invalidated.

## Tech stack

- Next.js 15 (App Router) + React 19, Tailwind CSS, shadcn-style components in `apps/web/components/ui`
- Zustand (UI state only), SSE for interview events
- Prisma + PostgreSQL 16 (Docker Compose, host port 5436, loopback only)
- Anthropic Claude for all prompts (`CLAUDE_MODEL`, default `claude-sonnet-5`) + `web_search` for company research; coach on `COACH_MODEL` (default `claude-haiku-4-5`)
- OpenAI Whisper (raw `fetch`, no SDK) for STT; ElevenLabs `eleven_turbo_v2_5` (raw `fetch`) for TTS
- Optional D-ID Talks streams over WebRTC for the video interviewer
- Turborepo + pnpm workspaces, TypeScript throughout, Node 20.19+

## Layout

```
apps/web/
  app/                      pages: / (landing), /new (setup), /interview/[id], /report/[id], /history
  app/api/
    parse-job/              job description → structured job (Claude)
    research-company/       company intel (Claude + web search, cached 7 days per company)
    sessions/               create/list; [id] GET/PATCH/DELETE; [id]/report GET (200/202/404) + POST regenerate
    interview/[id]/
      stream/               SSE (registers, then replays current state)
      start/                SETUP → BRIEFING → INTERVIEWING, opening + question 1
      answer/               multipart audio → transcribe → evaluate → next
      coach/                NDJSON stream from the coach model
      avatar-offer/         browser asks for a fresh D-ID offer (arrives via SSE)
      avatar-sdp/ avatar-ice/  WebRTC relay to D-ID
      avatar-speak/         browser triggers lip-sync when the clip starts playing
    audio/[blobId]/         serves cached TTS clips
  components/{setup,interview,report,history,landing,ui}/
  hooks/                    useInterviewStream (EventSource + useReducer), useAudioRecorder,
                            useAudioPlayback (FIFO queue), useAvatarStream, useWebcam, useCoach
  lib/                      i18n/, stores/, client-id.ts, rate-limit.ts, session-owner.ts,
                            saved-jobs.ts (localStorage postings + CV), mock-mode.ts, with-mock-mode.ts
packages/ai/src/
  client.ts                 Claude wrapper (retries, fence stripping, model config)
  prompts/                  job-parser, company-research, question-generator, answer-evaluator,
                            report-generator, stage-narrator, coach-explainer (+ language, recover helpers)
  services/                 interview-orchestrator (+ globalThis registry), adaptive-engine,
                            audio-pipeline, avatar-stream, coach-service, company-research-service, report-service
  cache/tts-cache.ts        pre-fetched clips + blob store
  sse/emitter.ts            Map<sessionId, controller>, globalThis singleton
  mock/                     fixtures for mock mode
packages/types/src/         Zod schemas, enums, SSE event union (events.ts)
packages/db/                Prisma schema, client singleton, seed
docs/                       design-system.md, FEATURES.md, history/
```

## Commands

```bash
pnpm dev            # web app on http://127.0.0.1:3000
pnpm build          # production build (only apps/web emits)
pnpm start          # serve the build on 127.0.0.1
pnpm lint           # ESLint (apps/web)
pnpm typecheck      # tsc --noEmit in every workspace
pnpm test           # node:test suites (packages/ai/test)
pnpm format:check   # Prettier check (do not mass-format unrelated code)
pnpm db:setup       # start Postgres (waits for healthcheck) + prisma db push
pnpm db:up | db:down | db:push | db:seed | db:studio
```

The project uses `prisma db push`, not migrations.

## Coding conventions

### API routes (thin controllers)
- Route Handlers in `apps/web/app/api/**/route.ts`. Validate input with Zod schemas from `packages/types`, apply a rate limit, check ownership on `[id]` routes, then call one function in `packages/ai`. Business logic in a route is a bug.
- Return `Response.json()` / `NextResponse.json()` for JSON, `new Response(stream)` for SSE/NDJSON.
- Error responses carry a stable `code`; never forward provider error bodies or stack traces to the client.
- Wrap handlers that call providers in `withMockMode`.

### Service layer (`packages/ai`)
- `InterviewOrchestrator` is the per-session coordinator, obtained via `getOrCreateOrchestrator(sessionId)`. It reloads state from Postgres on each request; in-process state is only locks and caches.
- `AdaptiveEngine.selectNext` is pure: follow-up when score < 65 (never chained), skip one easy question when score > 88 (same stage only), otherwise next, complete when none remain.
- Prompts return JSON (except the stage narrator, plain text). Validate with Zod; on failure merge over safe defaults and re-validate. Include "Return ONLY valid JSON" in JSON prompts. Treat user-supplied text (CV, job description, transcript) as data, not instructions.

### SSE events
Typed in `packages/types/src/events.ts`, shape `{ type, data }`:
`state_change`, `question_ready`, `audio_ready`, `transcription_complete`, `evaluation_complete`, `transition_text`, `stage_transition`, `interview_complete`, `avatar_stream_ready`, `avatar_stream_audio`, `avatar_stream_failed`, `error`.
The interview page reacts to these and never polls. The **report page does poll** `GET /api/sessions/[id]/report` (202 while generating).

### Singletons (`globalThis`, survive hot reload)
`__sseEmitter`, `__orchestrators`, `__ttsCache`, `__rateLimitStore`, `__mockModeStorage`, plus the Prisma client. All assume a single process.

### Frontend
- UI must follow [docs/design-system.md](docs/design-system.md): warm paper, JetBrains Mono, pastel tiles, light by default with a dark variant. Tailwind utilities and the component classes in `globals.css`; no new CSS files.
- Interview components are event-driven (SSE), not locally stateful.
- Desktop-first, mobile-functional.

### i18n
- Interface languages `en`, `pt`, `es` (cookie). Dictionaries in `apps/web/lib/i18n/dictionaries/<locale>/<namespace>.ts`.
- English is the source of truth; `pt` and `es` files are typed `typeof En`, so a missing key fails typecheck. Add every new string to all three.
- Server components: `getServerDictionary()`. Client components: `useI18n()`.
- Interview language (`Session.language`: `EN`, `PT_BR`, `ES`) is separate and drives prompts, Whisper and voices.

### Coach
- `POST /api/interview/[id]/coach` streams NDJSON from `COACH_MODEL` and saves a `CoachNote`. Notes asked before answering are flagged and feed the report's study plan. Pausing is client-side; nothing runs or bills while paused.

### Database
- Schema: `packages/db/prisma/schema.prisma`. Models: `Session`, `Question`, `CoachNote`, `Report`, `CompanyResearch`.
- JSON payloads stored as text (`JSON.stringify`/`parse`), shapes owned by Zod schemas in `packages/types`.
- CVs, transcripts and coach notes are stored in plaintext; there is no automatic purge.

### Mock mode
Dev-only cookie (`interviewiq_mock_mode`) held in `AsyncLocalStorage`. Covers job parsing, company research (fictional "Northwind Labs"), questions, evaluations, Whisper, TTS (silent clip) and D-ID. Needs no API keys. Ignored in production builds.

## Feature backlog

[`docs/FEATURES.md`](docs/FEATURES.md). When a backlog feature ships, set its status to `Completed` with the date.

## Commits

Conventional commits with a scope, as in `git log`: `feat(web): …`, `fix(video): …`, `chore(deps): …`, `docs: …`.
