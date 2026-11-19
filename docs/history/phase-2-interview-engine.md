# Phase 2 — Core Interview Engine (Week 2)

## Goals

7. Interview orchestrator service: manages full pipeline with SSE streaming
8. Audio pipeline service: Whisper + ElevenLabs coordination with pre-fetching
9. Adaptive engine: question selection, difficulty adjustment, follow-up logic
10. TTS cache: pre-generate upcoming question audio during user idle time
11. Interview page with SSE-driven UI (event-reactive, no polling)
12. Full question loop: speak → record → transcribe → evaluate → next (seamless)

---

## Module 2 — Interview Session Engine

### What it does

The core of the product. The interview orchestrator coordinates the entire pipeline: generates questions, manages the audio loop, evaluates answers, and drives adaptive question selection — all through a streaming connection that pushes events to the frontend in real-time.

### Architecture: Why an Orchestrator

A naive implementation makes 4 sequential API calls per question:
```
transcribe (2-3s) → evaluate (2-4s) → select next (0s) → synthesize TTS (2-3s)
= 7-12 seconds of dead air between user answer and next question
```

The orchestrator solves this through **pipelining and pre-fetching**:
```
While user answers question N:
  └── Pre-generate TTS for question N+1 (optimistic, cached)

When user finishes:
  ├── Whisper transcription (2-3s)
  ├── Claude evaluation (streams in parallel)
  │     ├── score >= 65 → play pre-cached N+1 TTS (instant)
  │     └── score < 65 + follow-up → generate new TTS (2-3s, only penalty case)
  └── SSE events fire as each step completes

Result: 0-3s perceived gap instead of 7-12s
```

---

### Interview Flow State Machine

The state machine lives **server-side** (DB + orchestrator), with Zustand mirroring it for UI reactivity. If the user refreshes, the server knows exactly where they are.

```
States (server-authoritative, synced to frontend via SSE):

  SETUP         → user configuring session (frontend only)
  RESEARCHING   → company intelligence running (SSE: progress events)
  BRIEFING      → show company context preview to user
  INTERVIEWING  → active audio loop (SSE: question/audio/eval events)
  TRANSITIONING → brief pause between questions with AI commentary
  WRAPPING_UP   → last question done, starting evaluation
  COMPLETED     → report ready

Server persists: session.status + session.currentIndex
Frontend mirrors: Zustand store subscribes to SSE events
```

---

### SSE Event Protocol

The interview page opens a single SSE connection. All interview state changes flow through it.

```typescript
// GET /api/interview/[id]/stream — SSE endpoint

// Events the server pushes:
{ type: "state_change",           data: { status: "INTERVIEWING" } }
{ type: "question_ready",         data: { questionId, text, category, order, total } }
{ type: "audio_ready",            data: { questionId, audioUrl: "/api/audio/[blob-id]" } }
{ type: "transcription_complete", data: { questionId, transcript } }
{ type: "evaluation_complete",    data: { questionId, score, tier } }
{ type: "transition_text",        data: { message: "Good point. Let's explore..." } }
{ type: "interview_complete",     data: { sessionId, redirectTo: "/report/[id]" } }
{ type: "error",                  data: { code, message, retryable: boolean } }
```

The frontend never polls — it reacts to events. This makes the UI feel responsive even while the backend pipelines heavy API calls.

---

### Service: Interview Orchestrator

The central coordinator. Owns the interview lifecycle from start to finish.

```typescript
// packages/ai/src/services/interview-orchestrator.ts

export class InterviewOrchestrator {
  private session: Session;
  private sseEmitter: SSEEmitter;
  private audioPipeline: AudioPipeline;
  private adaptiveEngine: AdaptiveEngine;
  private ttsCache: TTSCache;

  // Called when interview starts
  async startInterview(sessionId: string): Promise<void> {
    // 1. Load session + questions from DB
    // 2. Open SSE connection
    // 3. Pre-generate TTS for first question
    // 4. Emit question_ready + audio_ready events
    // 5. Start pre-fetching question 2 TTS in background
  }

  // Called when user submits an audio answer
  async handleAnswer(sessionId: string, audioBlob: Blob): Promise<void> {
    const currentQ = this.getCurrentQuestion();

    // Step 1: Transcribe (blocks — need the text)
    const transcript = await this.audioPipeline.transcribe(audioBlob, this.session.language);
    this.sseEmitter.emit("transcription_complete", { questionId: currentQ.id, transcript });

    // Step 2: Evaluate + decide next question (can overlap with TTS)
    const evaluation = await this.evaluate(currentQ, transcript);
    this.sseEmitter.emit("evaluation_complete", {
      questionId: currentQ.id,
      score: evaluation.score,
      tier: evaluation.tier,
    });

    // Step 3: Persist to DB
    await this.persistAnswer(currentQ.id, transcript, evaluation);

    // Step 4: Determine next question
    const next = this.adaptiveEngine.selectNext(
      this.session.questions,
      evaluation,
      this.session.currentIndex,
    );

    if (next === null) {
      // Interview complete
      this.sseEmitter.emit("state_change", { status: "WRAPPING_UP" });
      await this.generateReport();
      return;
    }

    // Step 5: Get audio (from cache if pre-fetched, or generate now)
    const audioUrl = await this.ttsCache.getOrGenerate(next, this.session.language);

    // Step 6: Emit transition + next question
    this.sseEmitter.emit("transition_text", { message: evaluation.shortFeedback });
    this.sseEmitter.emit("question_ready", {
      questionId: next.id,
      text: next.text,
      category: next.category,
      order: this.session.currentIndex + 1,
      total: this.session.questions.length,
    });
    this.sseEmitter.emit("audio_ready", { questionId: next.id, audioUrl });

    // Step 7: Pre-fetch TTS for question after next (background, non-blocking)
    this.ttsCache.prefetch(this.session.currentIndex + 2, this.session);
  }
}
```

---

### Service: Audio Pipeline

Coordinates Whisper (STT) and ElevenLabs (TTS) with proper error handling and retries.

```typescript
// packages/ai/src/services/audio-pipeline.ts

export class AudioPipeline {
  // Speech-to-Text via Whisper
  async transcribe(audioBlob: Blob, language: "en" | "pt"): Promise<string> {
    const openai = new OpenAI();
    const transcript = await openai.audio.transcriptions.create({
      file: new File([audioBlob], "answer.webm", { type: "audio/webm" }),
      model: "whisper-1",
      language,
      prompt: "This is a technical interview answer about software engineering.",
    });
    return transcript.text;
  }

  // Text-to-Speech via ElevenLabs
  async synthesize(text: string, language: "en" | "pt"): Promise<Buffer> {
    const voiceId = language === "pt" ? PT_VOICE_ID : EN_VOICE_ID;
    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.6, similarity_boost: 0.8 },
    });
    return Buffer.from(audio);
  }
}

const EN_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Rachel — professional, neutral
const PT_VOICE_ID = "..."; // TBD — natural PT-BR voice
```

---

### Service: TTS Cache

Pre-generates audio for upcoming questions during user idle time (while they're answering).

```typescript
// packages/ai/src/cache/tts-cache.ts

export class TTSCache {
  private cache: Map<string, Buffer> = new Map(); // questionId → audio buffer

  // Pre-fetch TTS for a specific question index
  async prefetch(questionIndex: number, session: Session): Promise<void> {
    const question = session.questions[questionIndex];
    if (!question || this.cache.has(question.id)) return;

    const audio = await this.audioPipeline.synthesize(question.text, session.language);
    this.cache.set(question.id, audio);
    // Also persist to disk as audioPath on the Question record
  }

  // Get cached audio or generate on-demand (for follow-up questions)
  async getOrGenerate(question: Question | string, language: string): Promise<string> {
    const questionId = typeof question === "string" ? null : question.id;
    const text = typeof question === "string" ? question : question.text;

    if (questionId && this.cache.has(questionId)) {
      return this.serveCached(questionId); // instant
    }

    // Cache miss (follow-up question) — generate now
    const audio = await this.audioPipeline.synthesize(text, language);
    const blobId = await this.store(audio);
    return `/api/audio/${blobId}`;
  }

  // Invalidate when adaptive engine swaps a question for a follow-up
  invalidate(questionId: string): void {
    this.cache.delete(questionId);
  }
}
```

---

### Service: Adaptive Engine

Question selection, difficulty adjustment, and follow-up logic.

```typescript
// packages/ai/src/services/adaptive-engine.ts

export class AdaptiveEngine {
  private runningScores: number[] = [];

  selectNext(
    questions: Question[],
    lastEvaluation: AnswerEvaluation,
    currentIndex: number,
  ): Question | string | null {
    this.runningScores.push(lastEvaluation.score);
    const nextIndex = currentIndex + 1;

    // Interview complete
    if (nextIndex >= questions.length) return null;

    // Weak answer with follow-up available → dig deeper
    if (lastEvaluation.followUpNeeded && lastEvaluation.score < 65) {
      return lastEvaluation.followUp!; // returns string (ad-hoc question)
    }

    // Strong answer → skip easy questions to challenge the candidate
    if (lastEvaluation.score > 88 && questions[nextIndex]?.difficulty < 3) {
      return questions[nextIndex + 1] ?? questions[nextIndex];
    }

    return questions[nextIndex];
  }

  // Running average for difficulty adjustment signals
  getRunningAverage(): number {
    if (this.runningScores.length === 0) return 0;
    return this.runningScores.reduce((a, b) => a + b, 0) / this.runningScores.length;
  }

  // Check if candidate is clearly above/below selected difficulty
  shouldAdjustDifficulty(): { adjust: boolean; direction: "up" | "down" } | null {
    if (this.runningScores.length < 3) return null;
    const avg = this.getRunningAverage();
    if (avg > 90) return { adjust: true, direction: "up" };
    if (avg < 40) return { adjust: true, direction: "down" };
    return null;
  }
}
```

---

### API Routes

The interview engine exposes 3 routes (thin controllers that delegate to the orchestrator):

| Route | Method | Purpose |
|---|---|---|
| `/api/interview/[id]/stream` | GET | SSE endpoint — frontend subscribes to interview events |
| `/api/interview/[id]/answer` | POST | Receives audio blob — triggers orchestrator pipeline |
| `/api/interview/[id]/start` | POST | Initializes interview — generates questions, starts pre-fetching |
| `/api/generate-questions` | POST | Generates question set from company context (called by orchestrator) |
| `/api/audio/[blobId]` | GET | Serves pre-cached TTS audio blobs |

```typescript
// apps/web/app/api/interview/[id]/answer/route.ts
// Thin controller — all logic lives in the orchestrator

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const formData = await req.formData();
  const audio = formData.get("audio") as Blob;

  const orchestrator = await getOrchestrator(params.id);
  await orchestrator.handleAnswer(params.id, audio);

  return Response.json({ ok: true });
}
```

---

### Question Generation Prompt

Called by the orchestrator during interview start. Generates the full question set.

#### Prompt: Question Set Generator

**System Prompt:**

```
You are an expert technical interviewer at {companyName} for the role of {jobTitle}.

Seniority level: {difficulty}. Interview type: {interviewType}.

Company context: {companySummary}
Primary skills required: {primarySkills}
Known company tech stack: {companyTechStack}

Generate a structured interview question set as JSON:

{
  "opening": string,  // warm intro, 1-2 sentences as the interviewer
  "questions": [
    {
      "id": string,
      "text": string,                    // the actual question
      "category": string,                // "technical" | "behavioral" | "system_design" | "culture_fit"
      "targetSkill": string,             // what this tests
      "difficulty": 1-5,
      "expectedDuration": number,        // seconds
      "followUpTriggers": [              // if answer mentions X, ask Y
        { "trigger": string, "followUp": string }
      ],
      "scoringGuide": {
        "poor": string,                  // what a weak answer looks like
        "good": string,                  // what a solid answer looks like
        "excellent": string              // what a standout answer looks like
      }
    }
  ],
  "closing": string                      // how interviewer wraps up
}

For JUNIOR: 5 questions, focus on fundamentals and enthusiasm.
For MID: 6 questions, balance technical depth with behavioral.
For SENIOR: 7 questions, heavy technical + system thinking.
For STAFF: 8 questions, architectural decisions + leadership + ambiguity.

Match question topics to the specific company context — reference their actual stack.

Return ONLY valid JSON.
```

**Notes:**
- Store full question set + scoringGuide in DB — needed for evaluation phase
- followUpTriggers enable in-flight adaptive questioning without a new API call
- Never start with "Tell me about yourself" — make opening question company-specific

---

### Per-Answer Evaluation Prompt

Called by the orchestrator after each transcription completes.

#### Prompt: Per-Answer Evaluator

**System Prompt:**

```
You are a senior interviewer at {companyName} evaluating a candidate for {jobTitle} ({difficulty}).

Question asked: {questionText}
What this question tests: {targetSkill}

Scoring guide:
- Poor answer: {scoringGuide.poor}
- Good answer: {scoringGuide.good}
- Excellent answer: {scoringGuide.excellent}

Candidate's answer (transcript): {transcript}

Evaluate and return JSON:

{
  "score": number,                  // 0-100
  "tier": "poor" | "good" | "excellent",
  "shortFeedback": string,          // 1 sentence — shown as transition between questions
  "followUpNeeded": boolean,        // should we ask a follow-up?
  "followUp": string | null,        // if followUpNeeded, the follow-up question
  "keyStrengths": string[],         // what they got right (for final report)
  "gaps": string[]                  // what was missing (for study plan)
}

Be rigorous but fair. Score calibrated to the difficulty level.
followUp should dig deeper into gaps or test edge case knowledge.

Return ONLY valid JSON.
```

**Notes:**
- shortFeedback is now user-visible — shown as transition text ("Good point on caching. Let's explore...")
- followUp replaces next scheduled question only if score < 65 (triggers TTS cache invalidation)
- keyStrengths and gaps are persisted per-question and accumulated for the final report

---

### Interview UI Components

The frontend is **event-reactive** — it subscribes to the SSE stream and updates UI based on events.

- **InterviewHeader** — shows company, role, difficulty badge, timer, question counter
- **QuestionCard** — displays question text with fade-in, category chip, estimated time. Driven by `question_ready` event.
- **AudioWaveform** — animated waveform while AI speaks or user records. Reacts to `audio_ready` events for playback.
- **RecordButton** — hold to record / tap to stop, with visual RMS meter. On stop, sends audio blob to `/api/interview/[id]/answer`.
- **TranscriptPreview** — shows transcription after `transcription_complete` event. Fades in naturally.
- **ProgressBar** — interview completion driven by `question_ready` event's `order/total`.
- **TransitionCard** — brief AI commentary between questions. Driven by `transition_text` event. Shows while next audio buffers.
- **ConnectionStatus** — SSE connection health indicator. Shows reconnecting state if connection drops.

```typescript
// apps/web/hooks/useInterviewStream.ts — SSE subscription hook

export function useInterviewStream(sessionId: string) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  useEffect(() => {
    const eventSource = new EventSource(`/api/interview/${sessionId}/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      dispatch({ type: data.type, payload: data.data });
    };

    eventSource.onerror = () => {
      dispatch({ type: "connection_error" });
      // Auto-reconnect is built into EventSource
    };

    return () => eventSource.close();
  }, [sessionId]);

  return state;
}
```

---

## Module 6 — Difficulty & Adaptive Intelligence

### Difficulty Calibration

Difficulty affects not just question complexity but also evaluation rigor, follow-up depth, and passing thresholds. The adaptive engine tracks answer quality in real-time and can signal adjustment if the candidate is clearly above or below the selected level.

| Level | Pass Threshold | Key Characteristics |
|---|---|---|
| **Junior** | ≥ 60 | Fundamentals, enthusiasm rewarded, no trick questions |
| **Mid** | ≥ 70 | Depth expected, breadth tested, tradeoffs matter |
| **Senior** | ≥ 75 | System thinking required, ambiguity handled, leadership signals |
| **Staff** | ≥ 80 | Org-level thinking, multiple constraints, no perfect answers |

### Adaptive Signals

The adaptive engine monitors running scores and can:
1. **Insert follow-ups** when score < 65 (dig deeper into gaps)
2. **Skip easy questions** when score > 88 (challenge the candidate)
3. **Signal difficulty mismatch** after 3+ questions if avg > 90 or avg < 40

These decisions happen server-side in the orchestrator — the frontend just reacts to whatever question comes next via SSE.

---

## Implementation Checklist

- [ ] Implement `InterviewOrchestrator` service in `packages/ai/src/services/`
- [ ] Implement `AudioPipeline` service (Whisper + ElevenLabs coordination)
- [ ] Implement `TTSCache` with pre-fetching and invalidation logic
- [ ] Implement `AdaptiveEngine` with running score tracking and follow-up logic
- [ ] Implement SSE endpoint: GET `/api/interview/[id]/stream`
- [ ] Implement answer submission: POST `/api/interview/[id]/answer`
- [ ] Implement interview start: POST `/api/interview/[id]/start`
- [ ] Implement audio serving: GET `/api/audio/[blobId]`
- [ ] Implement POST `/api/generate-questions` with Question Set Generator prompt
- [ ] Implement per-answer evaluation using Per-Answer Evaluator prompt
- [ ] Build `useInterviewStream` hook (SSE subscription + event reducer)
- [ ] Build audio recorder component using browser MediaRecorder API
- [ ] Build audio playback component (plays from `/api/audio/[blobId]` URLs)
- [ ] Build Interview page (`/interview/[id]`) — event-reactive UI
- [ ] Build all Interview UI components (InterviewHeader, QuestionCard, AudioWaveform, RecordButton, TranscriptPreview, ProgressBar, TransitionCard, ConnectionStatus)
- [ ] Wire up full interview flow end-to-end: start → SSE → speak → record → answer → evaluate → next
- [ ] Test pipeline latency: measure gap between user answer and next question playback
