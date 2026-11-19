# Architecture

InterviewIQ is a small monorepo with one unusual part: the backend is a **real-time orchestrator**, not a CRUD API. During an interview the server coordinates three external services (Claude, Whisper, ElevenLabs) in a pipeline and pushes typed events to the browser over a single Server-Sent Events connection. The interview page never polls and never drives state; it reacts. (The report page is the one exception: it polls while the report is being generated.)

This document explains how that works and the decisions behind it. For setup see the [README](README.md).

## Workspaces

```
apps/web            Next.js 15 (App Router). Pages, hooks, and thin API route handlers.
packages/ai         The service layer. Prompts, orchestrator, audio/avatar pipelines, caches, SSE emitter, mock mode.
packages/types      Zod schemas and TypeScript types shared by both sides, including the SSE event union.
packages/db         Prisma schema and a globalThis-cached PrismaClient.
```

Rules that keep the layers honest:

- **Routes are thin.** They validate the body with a schema from `packages/types`, apply a rate limit, check session ownership, and call one function in `packages/ai`. Business logic in a route handler is a bug.
- **The database is the source of truth.** Interview progress (`status`, `currentIndex`, the ordered question list, scores) lives in Postgres. In-process state is a cache or a lock, never the only copy.
- **The client mirrors, it does not decide.** Zustand holds UI state only. Everything about the interview arrives as SSE events.

## The interview pipeline

### Why a pipeline

A naive sequential flow has 7 to 12 seconds of dead air after every answer: upload, transcribe, evaluate, synthesize the next question, play. The orchestrator overlaps the expensive steps:

- While you answer question N, the server **pre-fetches TTS for question N+1** into a per-session cache.
- When your answer arrives it is transcribed and evaluated. If the next question is the scheduled one, its audio is already cached and plays immediately. If the evaluator inserts a follow-up instead, the cached clip is invalidated and a new one is synthesized (2 to 3 seconds).
- Each step emits an SSE event as soon as it completes, so the UI shows the transcript, then the score, then the next question, without waiting for the whole chain.

### Request flow

```
Setup page
  POST /api/parse-job          → Claude: structured job data
  POST /api/research-company   → Claude + web_search, cached 7 days per company
  POST /api/sessions           → Session row (status SETUP)

Interview page (on mount)
  GET  /api/interview/[id]/stream   SSE. Registers the connection, then REPLAYS current state.
  POST /api/interview/[id]/start    Claims SETUP → BRIEFING atomically, generates questions,
                                    sets INTERVIEWING, speaks opening + question 1.

Per answer
  POST /api/interview/[id]/answer   multipart audio
    → Whisper transcription                → SSE transcription_complete
    → Claude evaluation (score, feedback,
      follow-up suggestion, strengths, gaps) → SSE evaluation_complete
    → persist to Question row
    → AdaptiveEngine.selectNext()
        follow-up  → insert a Question row, shift later rows, speak it
        question   → speak it (cached audio if pre-fetched)
        stage edge → narrate the transition (Full Loop), then speak it
        complete   → speak closing, status WRAPPING_UP, generate report
                                           → SSE interview_complete { redirectTo }

Video mode (browser-initiated)
  POST /api/interview/[id]/avatar-offer   create a D-ID stream → SSE avatar_stream_ready (offer + ICE)
  POST /api/interview/[id]/avatar-sdp     relay the browser's SDP answer
  POST /api/interview/[id]/avatar-ice     relay ICE candidates
  POST /api/interview/[id]/avatar-speak   lip-sync the current line when its clip starts playing

Coach (while paused or between answers)
  POST /api/interview/[id]/coach    NDJSON stream from COACH_MODEL, saved as a CoachNote

Report page (polls)
  GET  /api/sessions/[id]/report    200 ready | 202 not ready | 404 unknown
  POST /api/sessions/[id]/report    regenerate if generation failed
```

### Session state machine

```
SETUP → BRIEFING → INTERVIEWING → WRAPPING_UP → COMPLETED
                 ↘ (failure before commit) back to SETUP
any non-completed state → ABANDONED (client-initiated, owner only)
```

- `SETUP → BRIEFING` is an atomic `updateMany` so two concurrent start requests cannot both generate questions. The orchestrator also holds an in-process promise lock, taken synchronously before any `await`.
- If question generation fails before `INTERVIEWING` is committed, the session rolls back to `SETUP` and the client gets a retryable error. If it fails afterwards (for example TTS), nothing is rolled back; a reconnect replays the current question.
- `WRAPPING_UP` without a report means generation failed or was interrupted. The report page polls, then offers a regenerate button; reconnecting to the stream also restarts generation in the background.

### Question ordering and the adaptive engine

Questions are rows with a dense, unique `order` per session (`0..n-1`). `Session.currentIndex` is a position in that ordered list. Follow-ups are inserted by shifting every later row up by one inside a transaction, so indexes always agree between processes and across restarts. Each row's `metadata` keeps the generated question (difficulty, target skill, scoring guide) and, for follow-ups, the parent id.

`AdaptiveEngine.selectNext` is a pure function of the ordered list, the latest evaluation and the current index:

| Rule | Condition |
|---|---|
| Follow-up | score < 65, the evaluator proposed one, and the current question is not itself a follow-up |
| Skip one question | score > 88, the next question has difficulty < 3, and both it and the one after are in the same stage as the current question |
| Next scheduled question | otherwise |
| Complete | no questions remain |

Full Loop generates one question set per stage (phone screen, technical, behavioral, system design) with each stage's own count, tags rows with `stage`, and narrates a transition whenever the next question's stage differs from the current one. The stage score is the mean of that stage's answered questions.

### Resume and reconnect

The SSE route registers the connection **first**, then asks the orchestrator to `resume()`. Resume reads the session and replays what the client needs: the current question with freshly generated audio while interviewing, the completion redirect when done, just the status otherwise. Because replay happens on every connect, an event emitted while the browser was disconnected (refresh, network blip, a second tab) is never permanently lost; at worst the client sees it twice, which the reducer tolerates.

The emitter keeps one controller per session and closes the previous one on re-register. `unregister` only removes a connection if it is still the active one, so a stale connection's teardown cannot drop a newer one. A `: ping` comment every 15 seconds keeps proxies from closing idle streams.

### Audio

- **STT:** OpenAI Whisper via a multipart `fetch` upload (no SDK), with the recording's real MIME type and a language hint. The browser picks the first format `MediaRecorder` supports (`webm/opus`, `webm`, `mp4`, `ogg`), which is what makes Safari work.
- **TTS:** ElevenLabs `eleven_turbo_v2_5`, one voice per language. The `TTSCache` holds pre-fetched clips keyed by **database question id** (globally unique, so sessions cannot collide) and served clips keyed by a random blob id under `/api/audio/[blobId]`. Both are scoped per session and expire after 30 minutes; finishing one interview never evicts another's audio.
- If TTS fails the question is still shown and an `AUDIO_UNAVAILABLE` error event tells the UI to let the user answer the written question.
- The browser plays audio through a FIFO queue so a Full Loop stage narration is never cut off by the next question's clip.

### Video mode (optional)

With a D-ID key and a video session, the **browser requests an offer on demand**: on mount, after a reload, or when its peer connection fails, it calls `POST /avatar-offer`. The orchestrator tears down any previous stream (offers are single-use), creates a Talks stream and emits the SDP offer and ICE servers as `avatar_stream_ready` over SSE. Creating streams only when a peer connection will actually be negotiated keeps usage inside D-ID's concurrent-stream cap. The browser builds an `RTCPeerConnection`, posts its answer and ICE candidates to two relay routes, and renders the remote video muted (the ElevenLabs clip is the audio you hear, D-ID provides lip-sync).

**Talks are triggered on play**: when a question clip starts playing, the browser calls `POST /avatar-speak` and the orchestrator sends the current line to D-ID, so mouth and voice start together. Text sent before the handshake completes is queued and flushed once the connection is up. The voice follows the session language. Streams are destroyed on completion, deletion or abandonment; a stream whose tab was simply closed lingers until D-ID's idle timeout.

## SSE event protocol

All events share the shape `{ type, data }`. `interviewEventSchema` in `packages/types/src/events.ts` is the single source: the server builds events against its inferred `InterviewEvent` type (`packages/ai/src/interview/events.ts`) and the client validates incoming payloads with it, dropping (and logging) any frame that does not match:

| Event | When |
|---|---|
| `state_change` | Session status changed, and on every connect |
| `question_ready` | A question is current. Carries id, text, category, `order`, `total`, `stage` (Full Loop, else null), `isFollowUp` |
| `audio_ready` | The clip for that question can be played |
| `transcription_complete` | Whisper finished |
| `evaluation_complete` | Score and tier for the answer |
| `transition_text` | One sentence of spoken feedback, or the closing |
| `stage_transition` | Full Loop stage boundary: `completedStage` / `nextStage` as `InterviewStage` enums (completed is null for the opening intro), with narration audio |
| `interview_complete` | Redirect to the report |
| `avatar_stream_ready` / `avatar_stream_audio` / `avatar_stream_failed` | Video mode lifecycle |
| `error` | `{ code: ErrorCode, retryable, message? }`. Localize by `code`; `message` is an English fallback for logs |

## Prompts

Six prompts live in `packages/ai/src/prompts/`. All but the stage narrator return JSON. Every response is validated with the Zod schema from `packages/types`; if validation fails, the raw output is merged over safe defaults and re-validated, and if that still fails the defaults alone are used. The orchestrator treats an empty question set as a hard, retryable failure rather than starting an interview with nothing to ask.

| Prompt | Called from |
|---|---|
| Job description parser | `/api/parse-job` |
| Company intelligence (web search) | `/api/research-company`, through the cached research service |
| Question set generator | orchestrator start, once per stage in Full Loop |
| Per-answer evaluator | orchestrator, per answer |
| Holistic report generator | orchestrator, at wrap-up or on regenerate |
| Stage transition narrator | orchestrator, between Full Loop stages |

The Claude client retries 429, 529 and 5xx with backoff, strips code fences, and joins every trailing text block of a response (web search answers with citations arrive split across several).

## Mock mode

Mock mode is a request-scoped flag held in `AsyncLocalStorage`, set by the `interviewiq_mock_mode` cookie and ignored in production. Routes wrap their handler in `withMockMode`, and everything spawned inside, including background TTS pre-fetches, inherits the flag. It covers the whole flow, including job parsing and company research (a fictional company, "Northwind Labs"), so a mock run needs no API keys and spends nothing. Under mock mode the Claude client returns fixtures (a parsed job, company intel, a question set, evaluations that rotate through scores chosen to trigger follow-ups and skips, a report), Whisper returns canned transcripts, ElevenLabs returns a short silent WAV, and D-ID returns a fake offer. The browser uses `speechSynthesis` to read questions aloud so the flow still feels real.

## Data model

```
Session          one interview: config, status, currentIndex, parsed job + company intel (JSON text),
                 opening/closing lines, videoMode, anonymous clientId
Question         ordered rows per session: text, category, stage, metadata (JSON), transcript,
                 score, feedback, strengths, gaps
Report           one per session: headline scores plus the full CoachingReport as JSON
CompanyResearch  cache of research results keyed by normalised company name
```

JSON is stored as text columns on purpose: the shapes are owned by Zod schemas in `packages/types`, and the typed columns exist for list views and as a fallback if the JSON cannot be parsed.

## Pause and coach

Pausing is a client-side hold. The server does nothing between answers (no timers, no polling), so pausing only stops the elapsed timer and blocks recording; nothing is billed. While paused, or any time the candidate is not mid-recording, highlighting text inside the question or their own transcript shows an "Explain this" button. That calls `POST /api/interview/[id]/coach`, which streams NDJSON deltas from a cheaper model (`COACH_MODEL`, default Haiku) with the question, its scoring guide, the transcript so far and the last few coach exchanges as context, then persists a `CoachNote`. Notes asked before the answer are flagged `askedBeforeAnswer`; the report marks those questions as coached, lists what was asked, and the report prompt treats asked-about topics as confirmed gaps for the study plan. Sessions can be created with `coachEnabled: false` to turn this off for a dress rehearsal.

## Languages

Two independent settings:

- **Interview language** (`Session.language`: `EN`, `PT_BR`, `ES`) drives everything the candidate hears: every prompt receives a language instruction, Whisper gets the matching language code and prompt, ElevenLabs and D-ID use a voice for that language.
- **Interface language** (`en`, `pt`, `es`) is a cookie read by the root layout. Dictionaries live in `apps/web/lib/i18n/dictionaries/<locale>/<namespace>.ts`; English is the typed source of truth and the other locales must provide the same keys. Server components read `getServerDictionary()`, client components `useI18n()`. Switching writes the cookie, updates client state and refreshes server components. The setup page defaults the interview language to the interface language on first visit.

## Identity and limits

There is no authentication; the app is meant for one person on localhost (see [SECURITY.md](SECURITY.md)). A UUID generated in the browser (`clientId`, in localStorage) is stored with each session and mirrored to a cookie so plain navigations and `EventSource` requests carry it too. Every session route (`/api/sessions/[id]/**`, `/api/interview/[id]/**`) checks that the caller's client id owns the session. Middleware rejects cross-site requests to `/api/*`, so a page you visit elsewhere cannot spend your keys by posting to `localhost`. "Delete all my data" on the History page deletes every session for this client id and clears the saved CV and postings from localStorage.

Rate limits are a fixed window per client id or per session, kept in process memory. The company research cache is keyed by company name only, so it is shared by everyone using one deployment.

## Process model and deployment

Several components are deliberately in-memory singletons stored on `globalThis` so they survive Next.js hot reloads: the orchestrator registry (and its per-session start, answer and report locks), the SSE connection map, the TTS cache and the rate limiter. The orchestrator itself is stateless apart from those locks; it reloads the session and question list from Postgres on every request, so a process restart only costs a reconnect.

**Single-process caveat.** All of that in-memory state is per process. With two processes, an SSE connection, an answer upload and an audio fetch can land on different ones: events go to a registry with no listener, clips 404, rate limits and locks are split. Atomic status transitions in Postgres keep the data consistent, but the live experience breaks. The supported shape is exactly one Node process.

What this means for hosting:

- **A single long-lived Node process** (`pnpm start`, which binds to `127.0.0.1`, or the `standalone` output) plus Postgres, on localhost or behind your own authenticating reverse proxy, is the supported shape.
- **Multi-instance or serverless** hosting breaks the SSE stream, audio serving and rate limiting, because the three requests involved can land on different instances. Moving audio blobs to object storage and SSE fan-out to a pub/sub channel would be required.

## Where to look

| Concern | File |
|---|---|
| Interview lifecycle | `packages/ai/src/interview/orchestrator.ts` (state machine) and its collaborators in `packages/ai/src/interview/` |
| Errors | `packages/ai/src/errors.ts` (`AppError`), `apps/web/lib/api-response.ts` (`apiError`), `packages/types/src/errors.ts` (`ErrorCode`); in the browser `apps/web/lib/api-client.ts` (`apiFetch`, `ApiError`) and `apps/web/lib/errors.ts` (`describeError`, code → `t.errors.api` copy) |
| Next-question rules | `packages/ai/src/services/adaptive-engine.ts` |
| Audio pre-fetch and serving | `packages/ai/src/cache/tts-cache.ts`, `apps/web/app/api/audio/[blobId]/route.ts` |
| SSE connections | `packages/ai/src/sse/emitter.ts`, `apps/web/app/api/interview/[id]/stream/route.ts` |
| Browser event handling | `apps/web/hooks/useInterviewStream.ts` (validates every frame with `interviewEventSchema`), `apps/web/lib/interview/phase-machine.ts` (pure reducer: what the candidate can do now), `apps/web/hooks/useInterviewController.ts` (wires stream, recorder, playback, avatar and coach to it) |
| Recording and playback | `apps/web/hooks/useAudioRecorder.ts`, `apps/web/hooks/useAudioPlayback.ts` |
| Report assembly | `packages/ai/src/services/report-service.ts` |
| Mock mode | `packages/ai/src/mock/`, `apps/web/lib/with-mock-mode.ts` |
| Ownership and rate limits | `apps/web/lib/session-owner.ts`, `apps/web/lib/rate-limit.ts`, `apps/web/middleware.ts` |
| Video avatar | `packages/ai/src/services/avatar-stream.ts`, `packages/ai/src/interview/avatar-relay.ts`, `apps/web/hooks/useAvatarStream.ts` |
