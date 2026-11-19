# Feature Backlog

Track feature ideas for InterviewIQ. Update status as features move through implementation.

**Statuses**: `Planned` | `In Progress` | `Completed`

---

## Features

### 1. Skip Question + Best Practice Report

**Status**: Planned
**Added**: 2026-03-15

Allow users to skip questions they don't know during an interview. Skipped questions are tracked and included in the coaching report with:
- The best-practice answer based on industry standards
- Real-world use cases and examples for the topic
- Study resources specific to the skipped area

This gives users learning value even from questions they couldn't answer, turning gaps into targeted study material.

**Touches**: Orchestrator, AdaptiveEngine, Interview UI (skip button), Report Generator prompt, Report UI

### 2. Pause + ask the coach mid-interview

**Status**: Completed
**Added**: 2026-11-18
**Completed**: 2026-11-18

Pause the interview at any point (no tokens spent while paused), highlight part of the question or your own transcript and get it explained by a cheaper coach model (`COACH_MODEL`, default Haiku). Notes are saved per question, flagged when asked before answering, shown in the report and fed into the study plan. Can be disabled per session from setup.

**Touches**: Prisma (`CoachNote`, `Session.coachEnabled`), coach prompt + streaming service + route, interview page (pause state, selection popover, coach drawer, `P` shortcut), setup toggle, report question review.

### 3. Design refresh

**Status**: Completed
**Added**: 2026-11-18
**Completed**: 2026-11-18

New visual language across every page: warm paper background, JetBrains Mono throughout, pastel tiles with an ink edge and hard offset shadow, light theme by default with a dark variant, and restrained motion. Documented in [`design-system.md`](design-system.md).

**Touches**: `globals.css` tokens, Tailwind config, all page and component styles, landing page.

### 4. Interface languages + Spanish interviews

**Status**: Completed
**Added**: 2026-11-18
**Completed**: 2026-11-18

The interface can be switched between English, Português and Español from the nav (cookie-based, server and client dictionaries). Interviews can now also be held in Spanish: every prompt receives a language instruction, Whisper gets the matching language hint, and ElevenLabs/D-ID use a voice per language (overridable with `ELEVENLABS_VOICE_*`). The setup page defaults the interview language to the interface language.

**Touches**: `apps/web/lib/i18n/` (dictionaries per locale and namespace), language select, `Language` enum (`ES`), prompts, audio pipeline, avatar stream.

### 5. Saved postings and CV

**Status**: Completed
**Added**: 2026-11-19
**Completed**: 2026-11-19

Job postings and the CV text can be saved in the browser (localStorage) and picked again on the setup page, which also restores an unfinished draft. The CV used for a session is stored with that session in Postgres.

**Touches**: `apps/web/lib/saved-jobs.ts`, setup page components.

### 6. Stop interview

**Status**: Completed
**Added**: 2026-11-19
**Completed**: 2026-11-19

A stop button (shortcut `Esc`) ends the interview early after a confirmation; the session is marked abandoned and you are taken back to History. Narration plays on demand, and audio capture recovers more reliably from device and permission hiccups.

**Touches**: interview page, sessions `PATCH` route, orchestrator cancellation.
