# Changelog

All notable changes to InterviewIQ are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Interview engine split into focused modules (session and question repositories, prompt context, question planner, event builders, avatar relay, report builder).
- One typed SSE event contract shared by server and client, validated with zod; Full Loop stages travel as enums.
- One error model: every API error is `{ error: { code, message, retryable } }`, localized on the client by code.
- Interview page driven by a pure, unit-tested phase machine; no lint suppressions left in the interview flow.
- Server fallback copy (opening, closing, feedback, narration) localized for EN, PT-BR and ES.
- Anthropic SDK 1.10 with the typed web search tool.

### Added
- Production Docker image and an opt-in `app` compose profile (localhost only).
- 147 tests across the interview engine, phase machine, API client, report service, SSE emitter and i18n parity.
- README screenshots.

## [0.1.0] - 2026-11-19

First public release: a self-hosted, single-user, bring-your-own-keys AI mock interview app.

### Added

- **Adaptive voice interviews.** Paste a job description and an AI interviewer asks questions out loud (ElevenLabs), you answer with your microphone (Whisper), and every answer is scored as you go. Weak answers get a follow-up; very strong ones let the interview skip ahead. The next question's audio is prepared while you answer, so there is no dead air.
- **Interview types and levels:** phone screen, technical, behavioral and system design, from junior to staff.
- **Full Loop mode:** all four stages in one session, with spoken transitions between stages.
- **Job parsing and company research:** the posting is turned into skills, seniority and focus areas, and the company is researched with web search (cached for a week per company) so questions fit the role.
- **Coaching report:** verdict, four dimension scores, strengths and gaps, a prioritized study plan with resources, a per-question review, tips for the real interview, and PDF export via print.
- **Session history:** list past interviews and drafts, resume interrupted ones, and refresh safely mid-interview (state lives in Postgres).
- **Pause and ask the coach** (`P`): pause at any point without being billed, highlight part of a question or your transcript, and get it explained by a small, cheaper model. Questions asked before answering are marked in the report and feed the study plan.
- **Stop the interview** at any time (`Esc`), and replay narration on demand.
- **Video interviewer (optional):** a D-ID real-time avatar with your webcam as a self-view.
- **Languages:** interface in English, Português and Español, switchable from the nav; interviews in English, Brazilian Portuguese or Spanish, with per-language voice overrides.
- **Saved postings and CV:** keep job descriptions and your CV in the browser and reuse them; the CV makes questions reference your background.
- **Mock mode** for development: the whole flow runs on fixtures with no API keys and no spend.
- **Design system:** a warm "paper" visual language with motion.
- Configurable models (`CLAUDE_MODEL`, `COACH_MODEL`), a sample interview seed, and a local Postgres via Docker Compose.

### Security

- **Localhost by default:** the app binds to `127.0.0.1` and Postgres to `127.0.0.1:5436`, so nothing is reachable from your network unless you choose to expose it.
- **Cross-site protection:** API requests from other sites are rejected, and responses carrying session data are not cached.
- **Ownership checks:** every session, interview, audio and coach route verifies that the session belongs to your browser's anonymous id.
- **Delete all my data** on the History page removes every session for your browser and clears the saved CV and postings.
- Provider error details are no longer passed through to the browser, and candidate-supplied text (job description, CV, answers) is passed to prompts as tagged data.

### Changed

- Question sets are generated through structured tool output, and the answer evaluator was tuned for more consistent scores.
- The D-ID avatar stays connected across reconnects and requests stream offers only on demand, to stay within the stream quota.
- Upgraded Next.js to 15.5.29; Node.js 20.19 or newer is required.

[Unreleased]: https://github.com/lourencopassos/interviewiq/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/lourencopassos/interviewiq/releases/tag/v0.1.0
