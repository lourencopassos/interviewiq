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
