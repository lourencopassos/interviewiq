# InterviewIQ — Agent & AI Reference

This document indexes all AI prompts, the orchestration architecture, agent delegation strategies, and implementation guidance for building InterviewIQ with Claude Code.

---

## Architecture: Real-Time Orchestrator

InterviewIQ's backend is not a collection of independent API routes — it's a **pipelined orchestration engine** that coordinates multiple external APIs (Claude, Whisper, ElevenLabs) to deliver a seamless conversational interview experience.

### The Problem

A naive sequential approach creates 7-12 seconds of dead air per question:
```
user finishes → upload audio (1-2s) → transcribe (2-3s) → evaluate (2-4s) → TTS (2-3s) → play
```

### The Solution: Pipeline + Pre-fetch + SSE

```
While user answers question N:
  └── Background: pre-generate TTS for question N+1 (cached)

When user finishes:
  ├── Whisper transcription (2-3s)
  ├── Claude evaluation (parallel with next step decision)
  │     ├── score >= 65 → play pre-cached N+1 TTS (instant ✓)
  │     └── score < 65 + follow-up → invalidate cache, generate new TTS (2-3s)
  └── SSE events fire to frontend as each step completes

Result: 0-3s gap instead of 7-12s
```

### Service Architecture

```
packages/ai/src/
├── client.ts                    # Claude API client wrapper (callClaude, callClaudeWithSearch)
├── index.ts                     # Public exports for all services, prompts, caches
├── prompts/                     # 6 prompt templates (parameterized, Zod-validated)
│   ├── job-parser.ts            # ✅ Phase 1
│   ├── company-research.ts      # ✅ Phase 1
│   ├── question-generator.ts    # ✅ Phase 2
│   ├── answer-evaluator.ts      # ✅ Phase 2
│   ├── report-generator.ts      # ⏳ Phase 3
│   └── stage-narrator.ts        # ⏳ Phase 3
├── services/
│   ├── interview-orchestrator.ts  # ✅ Phase 2 — Central coordinator + globalThis registry
│   ├── audio-pipeline.ts          # ✅ Phase 2 — Whisper STT (OpenAI SDK) + ElevenLabs TTS (raw fetch)
│   └── adaptive-engine.ts         # ✅ Phase 2 — Running scores, follow-ups, difficulty mismatch
├── cache/
│   └── tts-cache.ts               # ✅ Phase 2 — Pre-fetch + in-memory blob store
└── sse/
    └── emitter.ts                 # ✅ Phase 2 — SSE connection registry (globalThis singleton)
```

| Service | Responsibility |
|---|---|
| **InterviewOrchestrator** | Manages full interview pipeline. Receives audio answers, coordinates transcription + evaluation + TTS in parallel, pushes SSE events to frontend, handles session state transitions, triggers report generation on completion. |
| **AudioPipeline** | Coordinates Whisper (STT) and ElevenLabs (TTS). Handles audio blob management, language-specific voice selection, streaming audio responses. |
| **AdaptiveEngine** | Tracks running scores, selects next question (follow-up vs scheduled vs skip), detects difficulty mismatch after 3+ questions. |
| **TTSCache** | Pre-generates TTS for upcoming questions during user idle time. Invalidates and regenerates when adaptive engine swaps a question for a follow-up. |

---

## SSE Event Protocol

The interview page opens a single SSE connection. All interview state flows through typed events.

```typescript
// Event types pushed by the server:
{ type: "state_change",           data: { status: SessionStatus } }
{ type: "question_ready",         data: { questionId, text, category, order, total } }
{ type: "audio_ready",            data: { questionId, audioUrl } }
{ type: "transcription_complete", data: { questionId, transcript } }
{ type: "evaluation_complete",    data: { questionId, score, tier } }
{ type: "transition_text",        data: { message } }
{ type: "stage_transition",       data: { completedStage, stageScore, nextStage, transitionAudioUrl } }
{ type: "interview_complete",     data: { sessionId, redirectTo } }
{ type: "error",                  data: { code, message, retryable } }
```

Frontend subscribes via `useInterviewStream` hook (EventSource + useReducer). The UI is fully event-reactive — no polling, no sequential fetches.

---

## AI Prompts Index

6 prompts, all powered by Anthropic Claude (claude-sonnet). All return strict JSON except the Stage Transition Narrator.

| # | Prompt Name | Called By | Phase Doc | Purpose |
|---|---|---|---|---|
| 1 | **Job Description Parser** | POST `/api/parse-job` | [phase-1](phase-1-foundation.md) | Extract structured job data from raw text |
| 2 | **Company Intelligence Research** | POST `/api/research-company` | [phase-1](phase-1-foundation.md) | Web search for company context (uses `web_search` tool) |
| 3 | **Question Set Generator** | Orchestrator (via `/api/interview/[id]/start`) | [phase-2](phase-2-interview-engine.md) | Generate adaptive interview questions with scoring guides |
| 4 | **Per-Answer Evaluator** | Orchestrator (after each transcription) | [phase-2](phase-2-interview-engine.md) | Score each answer, identify gaps, generate follow-ups |
| 5 | **Holistic Report Generator** | Orchestrator (on WRAPPING_UP) | [phase-3](phase-3-report-history.md) | Comprehensive coaching report with study plan |
| 6 | **Stage Transition Narrator** | Orchestrator (Full Loop between stages) | [phase-3](phase-3-report-history.md) | Natural transition text spoken via TTS (plain text, not JSON) |

### Prompt Design Principles

- All prompts include `"Return ONLY valid JSON"` (except narrator)
- System prompts are parameterized with session context (`{companyName}`, `{jobTitle}`, `{difficulty}`, etc.)
- Scoring guides are generated at question time and reused at evaluation time
- Company research output feeds into question generation as context
- Per-answer `keyStrengths` and `gaps` are persisted per-question in DB and accumulated for the final report
- `shortFeedback` from evaluator is shown to user as transition text between questions

### Claude Configuration

```typescript
// packages/ai/src/client.ts

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

---

## External API Integrations

### OpenAI Whisper (Speech-to-Text)
- **Called by**: `AudioPipeline.transcribe()`
- **Model**: `whisper-1`
- **Input**: Audio blob (webm) + language hint ("en" | "pt")
- **Output**: Transcribed text string
- **Key detail**: Include prompt hint "This is a technical interview answer about software engineering" for accuracy

### ElevenLabs (Text-to-Speech)
- **Called by**: `AudioPipeline.synthesize()` and `TTSCache.prefetch()`
- **Model**: `eleven_turbo_v2_5` (lowest latency)
- **Voices**: Rachel (EN, ID: `EXAVITQu4vr4xnSDxMaL`), separate voice for PT-BR
- **Settings**: stability 0.6, similarity_boost 0.8
- **Output**: audio/mpeg buffer (cached as blob, served via `/api/audio/[blobId]`)

---

## Data Flow

```
User pastes job description
    │
    ▼
POST /api/parse-job ──────────► Claude: Job Description Parser
    │                                  │
    ▼                                  ▼
POST /api/research-company ────► Claude + web_search: Company Intelligence
    │
    ▼
Company context packet (job data + company intel)
    │
    ▼
POST /api/interview/[id]/start ► Orchestrator initializes:
    │                               ├── Claude: Question Set Generator → questions stored in DB
    │                               ├── Pre-fetch TTS for question 1
    │                               └── Open SSE stream to frontend
    │
    ▼
GET /api/interview/[id]/stream ◄── SSE connection (persistent)
    │
    ▼
┌─── Orchestrator Interview Loop ─────────────────────────────────┐
│                                                                  │
│  SSE → question_ready + audio_ready                             │
│  Frontend plays TTS question                                     │
│       │                                                          │
│       ▼                                                          │
│  User records answer (MediaRecorder)                             │
│  [Background: TTSCache pre-fetches question N+1]                │
│       │                                                          │
│       ▼                                                          │
│  POST /api/interview/[id]/answer (audio blob)                   │
│       │                                                          │
│       ▼                                                          │
│  Orchestrator pipeline:                                          │
│    ├── AudioPipeline.transcribe() → SSE: transcription_complete │
│    ├── Claude: Per-Answer Evaluator → SSE: evaluation_complete  │
│    ├── AdaptiveEngine.selectNext() → decide follow-up or next   │
│    ├── TTSCache.getOrGenerate() → SSE: audio_ready              │
│    └── SSE: transition_text + question_ready                     │
│                                                                  │
│  [If Full Loop: stage_transition events between stages]          │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
Orchestrator: WRAPPING_UP
    ├── Claude: Holistic Report Generator → Report stored in DB
    ├── Session status → COMPLETED
    └── SSE: interview_complete { redirectTo: "/report/[id]" }
    │
    ▼
Report page loads from DB (no SSE needed)
```

---

## Agent Delegation Strategy

When implementing InterviewIQ with Claude Code, work phase by phase. Each phase can be broken into parallel agent tasks where dependencies allow.

### Phase 1 — Foundation

**Sequential (order matters):**
1. **Scaffold Agent**: Initialize Turborepo monorepo, configure packages, set up Prisma schema (with expanded fields: clientId, currentIndex, strengths/gaps, full SessionStatus enum), run migrations
2. **AI Package Agent**: Set up `packages/ai` — Claude client wrapper, prompt definitions for Job Parser and Company Research, service layer stubs with exported interfaces
3. **UI Agent**: Build Setup page (`/new`) with form components, preview card, wire up parse → research → preview flow

### Phase 2 — Interview Engine (most complex phase)

**Parallel — Services (no UI dependencies):**
- **Orchestrator Agent**: Build `InterviewOrchestrator` — full pipeline, SSE emission, session state management, report trigger
- **Audio Agent**: Build `AudioPipeline` (Whisper + ElevenLabs), `TTSCache` with pre-fetching and invalidation
- **Adaptive Agent**: Build `AdaptiveEngine` — running scores, follow-up logic, difficulty mismatch detection

**Parallel — API + UI (depends on services):**
- **API Agent**: SSE endpoint (`/api/interview/[id]/stream`), answer endpoint (`/api/interview/[id]/answer`), start endpoint, audio serving, question generation route
- **UI Agent**: `useInterviewStream` hook, all interview components (InterviewHeader, QuestionCard, AudioWaveform, RecordButton, TranscriptPreview, ProgressBar, TransitionCard, ConnectionStatus)

**Sequential (after all above):**
- **Integration Agent**: Wire up full end-to-end flow. Test latency. Verify SSE event ordering.

### Phase 3 — Report & History

**Parallel:**
- **Report Agent**: Report generation (wired into orchestrator's WRAPPING_UP), report page with all UI components
- **History Agent**: Session CRUD routes, history page, anonymous client ID, filters, sparklines
- **Full Loop Agent**: Multi-stage orchestration, stage-level scoring, stage transitions with narrator prompt + TTS

**Sequential:**
- **Export Agent**: PDF export route (after report page is done)

### Phase 4 — Polish & Launch

**Parallel:**
- **Landing Agent**: Landing page with hero, how-it-works, demo report preview
- **Polish Agent**: Loading states, error boundaries, retry logic, SSE reconnection handling
- **Mobile Agent**: Responsive layout pass on all pages
- **Infra Agent**: Rate limiting middleware, Vercel config, seed script, OG tags

---

## Key TypeScript Interfaces

These should live in `packages/types/src/`:

```typescript
// Session & configuration
interface ParsedJob {
  jobTitle: string;
  companyName: string;
  seniority: "junior" | "mid" | "senior" | "staff";
  primarySkills: string[];
  secondarySkills: string[];
  domain: string;
  keyResponsibilities: string[];
  inferredStack: string[];
  interviewFocus: string[];
  companySummary: string;
}

interface CompanyIntelligence {
  companySize: string;
  fundingStage: string;
  techStack: string[];
  engineeringCulture: string;
  recentNews: string[];
  interviewProcess: string;
  knownChallenges: string[];
  values: string[];
  coachingTip: string;
}

// Questions
interface GeneratedQuestion {
  id: string;
  text: string;
  category: "technical" | "behavioral" | "system_design" | "culture_fit";
  targetSkill: string;
  difficulty: number; // 1-5
  expectedDuration: number;
  followUpTriggers: { trigger: string; followUp: string }[];
  scoringGuide: { poor: string; good: string; excellent: string };
}

interface QuestionSet {
  opening: string;
  questions: GeneratedQuestion[];
  closing: string;
}

// Evaluation
interface AnswerEvaluation {
  score: number;
  tier: "poor" | "good" | "excellent";
  shortFeedback: string;
  followUpNeeded: boolean;
  followUp: string | null;
  keyStrengths: string[];
  gaps: string[];
}

// SSE Events
type InterviewEvent =
  | { type: "state_change"; data: { status: SessionStatus } }
  | { type: "question_ready"; data: { questionId: string; text: string; category: string; order: number; total: number } }
  | { type: "audio_ready"; data: { questionId: string; audioUrl: string } }
  | { type: "transcription_complete"; data: { questionId: string; transcript: string } }
  | { type: "evaluation_complete"; data: { questionId: string; score: number; tier: string } }
  | { type: "transition_text"; data: { message: string } }
  | { type: "stage_transition"; data: { completedStage: string; stageScore: number; nextStage: string; transitionAudioUrl: string } }
  | { type: "interview_complete"; data: { sessionId: string; redirectTo: string } }
  | { type: "error"; data: { code: string; message: string; retryable: boolean } };

// Report
interface CoachingReport {
  overallScore: number;
  verdict: "Strong Pass" | "Lean Pass" | "Borderline" | "No Pass";
  executiveSummary: string;
  dimensionScores: {
    technical: number;
    problemSolving: number;
    communication: number;
    behavioral: number;
  };
  strengths: { title: string; detail: string }[];
  areasToImprove: { title: string; detail: string; priority: "high" | "medium" | "low" }[];
  studyPlan: StudyPlanItem[];
  nextInterviewTips: string[];
  companyCultureFit: string;
  estimatedRetakeReadiness: number;
}

interface StudyPlanItem {
  topic: string;
  whyItMatters: string;
  resources: { type: "book" | "course" | "practice" | "article"; title: string; url: string | null }[];
  practicePrompt: string;
  estimatedHours: number;
}
```

---

## Feature Backlog Maintenance

Feature ideas are tracked in [`docs/FEATURES.md`](../FEATURES.md). After completing any feature listed in the backlog:
1. Update its status from `Planned` or `In Progress` to `Completed`
2. Add a `**Completed**: YYYY-MM-DD` line below the status
3. If the implementation differed from the original description, add a brief note

---

## Testing Strategy

### Per Phase

| Phase | Testing Focus |
|---|---|
| **Phase 1** | Unit tests for job parser response validation, Prisma schema correctness, API route integration tests |
| **Phase 2** | Orchestrator pipeline unit tests (mock all external APIs), SSE event ordering, TTS cache hit/miss/invalidation, adaptive engine logic, AudioPipeline with mocked Whisper/ElevenLabs, latency measurement tests |
| **Phase 3** | Report generation with mock evaluation data, session CRUD with clientId filtering, PDF export output, Full Loop stage transition ordering |
| **Phase 4** | E2E full interview flow (mocked APIs), SSE reconnection behavior, mobile responsive visual checks, rate limiter behavior, error boundary fallbacks |

### AI Prompt Testing

- Use fixture data (sample job descriptions, sample transcripts) for deterministic testing
- Validate JSON schema of AI responses with Zod
- Test fallback behavior when AI returns malformed JSON
- Mock Claude API in tests to avoid cost and flakiness

### Orchestrator Testing

- Test pipeline with all external APIs mocked — verify correct SSE event sequence
- Test TTS cache pre-fetching: cache hit when score >= 65, cache miss + regeneration when follow-up needed
- Test adaptive engine: follow-up insertion at score < 65, question skipping at score > 88, difficulty mismatch detection after 3+ answers
- Test session recovery: simulate refresh mid-interview, verify server restores correct state
- Measure end-to-end latency: time from user answer submission to next question audio playback
