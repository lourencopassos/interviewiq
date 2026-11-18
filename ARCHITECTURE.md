# Architecture

InterviewIQ is a small monorepo with one unusual part: the backend is a **real-time orchestrator**, not a CRUD API. During an interview the server coordinates three external services (Claude, Whisper, ElevenLabs) in a pipeline and pushes typed events to the browser over a single Server-Sent Events connection. The browser never polls and never drives state; it reacts.

This document explains how that works and the decisions behind it. For setup see the [README](README.md).

## Workspaces

```
apps/web            Next.js 15 (App Router). Pages, hooks, and thin API route handlers.
packages/ai         The service layer. Prompts, orchestrator, audio/avatar pipelines, caches, SSE emitter, mock mode.
packages/types      Zod schemas and TypeScript types shared by both sides, including the SSE event union.
packages/db         Prisma schema and a globalThis-cached PrismaClient.
packages/ui         Shared cn() helper for shadcn-style components.
```

Rules that keep the layers honest:

- **Routes are thin.** They validate the body with a schema from `packages/types`, apply a rate limit, and call one function in `packages/ai`. Business logic in a route handler is a bug.
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

Report page
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

- **STT:** OpenAI Whisper via multipart upload, with the recording's real MIME type and a language hint. The browser picks the first format `MediaRecorder` supports (`webm/opus`, `webm`, `mp4`, `ogg`), which is what makes Safari work.
- **TTS:** ElevenLabs `eleven_turbo_v2_5`, one voice per language. The `TTSCache` holds pre-fetched clips keyed by **database question id** (globally unique, so sessions cannot collide) and served clips keyed by a random blob id under `/api/audio/[blobId]`. Both are scoped per session and expire after 30 minutes; finishing one interview never evicts another's audio.
- If TTS fails the question is still shown and an `AUDIO_UNAVAILABLE` error event tells the UI to let the user answer the written question.
- The browser plays audio through a FIFO queue so a Full Loop stage narration is never cut off by the next question's clip.

### Video mode (optional)

With a D-ID key, `start` creates a Talks stream and emits the SDP offer and ICE servers over SSE. The browser builds an `RTCPeerConnection`, posts its answer and ICE candidates to two relay routes, and renders the remote video muted (the ElevenLabs clip is the audio you hear, D-ID provides lip-sync). Text sent before the handshake completes is queued and flushed once the SDP answer arrives, so the first question is not lost. The voice follows the session language. Streams are destroyed on completion, deletion or abandonment.

## SSE event protocol

All events share the shape `{ type, data }` and are typed in `packages/types/src/events.ts`:

| Event | When |
|---|---|
| `state_change` | Session status changed, and on every connect |
| `question_ready` | A question is current. Carries id, text, category, `order`, `total`, `isFollowUp` |
| `audio_ready` | The clip for that question can be played |
| `transcription_complete` | Whisper finished |
| `evaluation_complete` | Score and tier for the answer |
| `transition_text` | One sentence of spoken feedback, or the closing |
| `stage_transition` | Full Loop stage boundary, with narration audio |
| `interview_complete` | Redirect to the report |
| `avatar_stream_ready` / `avatar_stream_audio` / `avatar_stream_failed` | Video mode lifecycle |
| `error` | `{ code, message, retryable }` |

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

Mock mode is a request-scoped flag held in `AsyncLocalStorage`, set by the `interviewiq_mock_mode` cookie and ignored in production. Routes wrap their handler in `withMockMode`, and everything spawned inside, including background TTS pre-fetches, inherits the flag. Under mock mode the Claude client returns fixtures (a question set, evaluations that rotate through scores chosen to trigger follow-ups and skips, a report), Whisper returns canned transcripts, ElevenLabs returns a short silent WAV, and D-ID returns a fake offer. The browser uses `speechSynthesis` to read questions aloud so the flow still feels real.

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

## Identity and limits

There is no authentication. A UUID generated in the browser (`clientId`) is stored with each session; listing, deleting and abandoning sessions require it, reading a session or report by id does not. Rate limits are a fixed window per client id or per session, kept in process memory.

## Process model and deployment

Several components are deliberately in-memory singletons stored on `globalThis` so they survive Next.js hot reloads: the orchestrator registry, the SSE connection map, the TTS cache and the rate limiter. The orchestrator itself is stateless apart from locks; it reloads the session and question list from Postgres on every request, so a process restart or a second process only costs a reconnect.

What this means for hosting:

- **A single long-lived Node process** (`next start`, or the `standalone` output in a container) plus Postgres is the supported shape.
- **Multi-instance or serverless** hosting breaks the SSE stream, audio serving and rate limiting, because the three requests involved can land on different instances. Moving audio blobs to object storage and SSE fan-out to a pub/sub channel would be required.

## Where to look

| Concern | File |
|---|---|
| Interview lifecycle | `packages/ai/src/services/interview-orchestrator.ts` |
| Next-question rules | `packages/ai/src/services/adaptive-engine.ts` |
| Audio pre-fetch and serving | `packages/ai/src/cache/tts-cache.ts`, `apps/web/app/api/audio/[blobId]/route.ts` |
| SSE connections | `packages/ai/src/sse/emitter.ts`, `apps/web/app/api/interview/[id]/stream/route.ts` |
| Browser event handling | `apps/web/hooks/useInterviewStream.ts`, `apps/web/app/interview/[id]/page.tsx` |
| Recording and playback | `apps/web/hooks/useAudioRecorder.ts`, `apps/web/hooks/useAudioPlayback.ts` |
| Report assembly | `packages/ai/src/services/report-service.ts` |
| Mock mode | `packages/ai/src/mock/`, `apps/web/lib/with-mock-mode.ts` |
