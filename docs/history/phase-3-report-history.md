# Phase 3 — Report & History (Week 3)

## Goals

13. Report generation: orchestrator triggers POST /api/generate-report on interview completion
14. Report page: score gauges, strengths, study plan, per-question review
15. Session history page with clientId-based anonymous tracking
16. PDF export route (html-to-pdf or Puppeteer)
17. Full Loop mode: multi-stage orchestration with stage transitions + stage-level scoring

---

## Module 3 — Evaluation & Coaching Report

### What it does

After all questions are complete, the orchestrator transitions to `WRAPPING_UP` state and triggers a holistic evaluation across all answers. It produces a scored coaching report with specific, actionable study recommendations — not just a scorecard.

The report generation is triggered server-side by the orchestrator (not by a frontend call). The frontend receives an `interview_complete` SSE event with a redirect to `/report/[id]` once the report is ready.

### API Route: POST /api/generate-report

#### Prompt: Holistic Report Generator

**System Prompt:**

```
You are an expert technical interview coach preparing a debrief for a candidate.

Interview context:
- Role: {jobTitle} at {companyName}
- Difficulty: {difficulty}
- Interview type: {interviewType}

Question + answer transcript pairs:
{questionsWithAnswers} // [{question, transcript, score, gaps, keyStrengths}]

Generate a comprehensive coaching report as JSON:

{
  "overallScore": number,              // weighted 0-100
  "verdict": string,                   // "Strong Pass" | "Lean Pass" | "Borderline" | "No Pass"
  "executiveSummary": string,          // 3-4 sentences honest overall assessment
  "dimensionScores": {
    "technical": number,
    "problemSolving": number,
    "communication": number,
    "behavioral": number               // if applicable
  },
  "strengths": [
    { "title": string, "detail": string }  // 3-5 genuine strengths
  ],
  "areasToImprove": [
    { "title": string, "detail": string, "priority": "high"|"medium"|"low" }
  ],
  "studyPlan": [
    {
      "topic": string,                 // e.g. "Distributed Systems Consistency"
      "whyItMatters": string,          // specific to this role/company
      "resources": [
        { "type": "book"|"course"|"practice"|"article", "title": string, "url": string|null }
      ],
      "practicePrompt": string,        // specific thing to practice
      "estimatedHours": number
    }
  ],
  "nextInterviewTips": string[],       // 3-5 tactical tips for the actual interview
  "companyCultureFit": string,         // how well they seem to fit {companyName} culture
  "estimatedRetakeReadiness": number   // days before retake would be beneficial
}

Be specific, honest, and constructive. Reference actual answer content.
studyPlan should be prioritized — most impactful gaps first.

Return ONLY valid JSON.
```

**Notes:**
- `estimatedRetakeReadiness` drives the "Practice Again" CTA timing suggestion
- Resources should be real, well-known references — no hallucinated URLs
- For PT-BR language sessions, resource titles can mix EN/PT as appropriate
- The report uses accumulated `keyStrengths` and `gaps` from per-question evaluations (already in DB from orchestrator)

### Report Generation in the Orchestrator

```typescript
// Called by InterviewOrchestrator when last question is answered

async generateReport(): Promise<void> {
  // 1. Transition state
  await db.session.update({ where: { id: this.session.id }, data: { status: "WRAPPING_UP" } });
  this.sseEmitter.emit("state_change", { status: "WRAPPING_UP" });

  // 2. Load all questions with answers, scores, strengths, gaps
  const questionsWithAnswers = await db.question.findMany({
    where: { sessionId: this.session.id },
    orderBy: { order: "asc" },
  });

  // 3. Call report generation prompt
  const report = await generateCoachingReport(this.session, questionsWithAnswers);

  // 4. Persist report to DB
  await db.report.create({ data: { sessionId: this.session.id, ...report } });

  // 5. Update session status
  await db.session.update({ where: { id: this.session.id }, data: { status: "COMPLETED" } });

  // 6. Notify frontend
  this.sseEmitter.emit("interview_complete", {
    sessionId: this.session.id,
    redirectTo: `/report/${this.session.id}`,
  });
}
```

### Report UI

- **Score dashboard** — circular score gauges for overall + each dimension
- **Verdict banner** — color coded (green/yellow/orange/red) with verdict label
- **Executive summary** — prose card at top
- **Strengths / Areas to Improve** — side by side cards
- **Study Plan** — expandable accordion per topic, with resources and practice prompt
- **Per-question review** — expandable list, shows question, transcript, score, feedback
- **Next Tips panel** — quick wins for the actual interview
- **Action buttons** — "Practice Again" (new session same role), "Export PDF", "Share Link"

---

## Module 4 — Session History & Score Persistence

### What it does

No auth required for MVP. Sessions are tracked by a random UUID stored in localStorage. Users can view past sessions, compare scores, and retake interviews. Score trends visible over time.

### Session List Page

- Grid of past session cards: company logo (via Clearbit), role, date, score badge
- Filter by: date range, difficulty, interview type
- Score sparkline per session showing trend over time
- Quick actions: View Report, Retake, Delete

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/sessions` | GET | List all sessions by clientId (from X-Client-ID header) |
| `/api/sessions/:id` | GET | Get single session with questions + report |
| `/api/sessions/:id` | PATCH | Update session status |
| `/api/sessions/:id` | DELETE | Soft delete session |
| `/api/sessions/:id/report` | GET | Get report for session |
| `/api/export/:id` | GET | Export report as PDF (html-pdf or puppeteer) |

### Anonymous Session Tracking

```typescript
// apps/web/lib/client-id.ts

export function getClientId(): string {
  if (typeof window === "undefined") return "";

  const existing = localStorage.getItem("interviewiq_client_id");
  if (existing) return existing;

  const newId = crypto.randomUUID();
  localStorage.setItem("interviewiq_client_id", newId);
  return newId;
}

// Attach as header to all API calls
// X-Client-ID: {uuid}
```

The `clientId` is stored on the Session model (added in updated schema) so the server can filter sessions by client without auth.

---

## Module 5 — Multi-Stage Interview Mode

### What it does

"Full Loop" mode simulates the complete recruitment process in one session: a phone screen, followed by a technical round, a behavioral round, and optionally a system design round. Each stage has a separate AI evaluator and produces separate scores that roll up to a final hiring recommendation.

### How it integrates with the orchestrator

The orchestrator manages Full Loop as multiple sequential interview cycles within one session. Between stages, it:
1. Calculates stage-level scores from accumulated per-question evaluations
2. Generates a transition narrative via TTS
3. Emits a `stage_transition` SSE event with stage scores and next stage info
4. Pre-fetches TTS for the first question of the next stage

```typescript
// SSE event for stage transitions
{ type: "stage_transition", data: {
    completedStage: "PHONE_SCREEN",
    stageScore: 78,
    nextStage: "TECHNICAL",
    transitionAudioUrl: "/api/audio/[blob-id]",
    transitionText: "Great job on the phone screen..."
}}
```

### Stage Configuration

| Stage | Duration | Focus |
|---|---|---|
| **Phone Screen** | ~10 min / 3-4 questions | Culture fit, background, basic technical bar |
| **Technical** | ~20 min / 5-7 questions | Core skills, coding approaches, depth of knowledge |
| **Behavioral** | ~15 min / 4-5 questions | STAR method, leadership, conflict, decision making |
| **System Design** | ~20 min / 2-3 questions | Architecture, tradeoffs, scalability thinking |

### Prompt: Stage Transition Narrator

**System Prompt:**

```
You are the AI coordinator of a full-loop interview simulation.

The candidate just completed the {previousStage} stage with a score of {stageScore}/100.

Write a brief, natural transition message (2-3 sentences) that:
1. Acknowledges completion of the previous stage naturally
2. Sets expectations for the next stage: {nextStage}
3. Gives one brief tip relevant to the upcoming stage

Tone: professional but warm, like a real recruiter would speak.
Do NOT reveal individual question scores. Keep it motivating.

Return plain text, no JSON needed.
```

**Notes:**
- This is spoken aloud via TTS between stages — keep it to 30-45 seconds when read aloud
- Store stage scores separately in DB for granular reporting
- The orchestrator generates this narrative, synthesizes TTS, and emits it as a `stage_transition` event

---

## Implementation Checklist

- [ ] Add report generation to orchestrator's `WRAPPING_UP` flow
- [ ] Implement POST `/api/generate-report` with Holistic Report Generator prompt
- [ ] Build Report page (`/report/[id]`) with score gauges, verdict banner, executive summary
- [ ] Build strengths/areas-to-improve cards (side by side)
- [ ] Build study plan accordion component with resources and practice prompts
- [ ] Build per-question review expandable list
- [ ] Build next tips panel and action buttons
- [ ] Implement anonymous client ID utility (`apps/web/lib/client-id.ts`)
- [ ] Implement GET/PATCH/DELETE `/api/sessions` routes (filtered by X-Client-ID header)
- [ ] Implement GET `/api/sessions/:id/report` route
- [ ] Build Session History page (`/history`) with session cards, filters, sparklines
- [ ] Implement PDF export route (`/api/export/:id`)
- [ ] Implement Full Loop mode in orchestrator (multi-stage question sets, stage-level scoring)
- [ ] Implement Stage Transition Narrator prompt + TTS synthesis
- [ ] Add `stage_transition` SSE event type to interview stream
- [ ] Store stage-level scores separately for granular reporting
