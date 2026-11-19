# Contributing

Thanks for helping. InterviewIQ is a small, self-hosted app; changes that keep it simple to run on one machine are the easiest to accept. For anything larger than a fix, please open an issue first so we can agree on the approach.

## Setup

Follow the [README quick start](README.md#quick-start): Node 20.19+ (`nvm use`), `corepack enable`, `pnpm install`, copy the two env files, `pnpm db:setup`, `pnpm dev`.

### Mock mode

You do not need API keys to work on most of the app. In `pnpm dev`, switch on the mock toggle in the bottom-left corner: job parsing, company research, questions, evaluations, transcription and audio all run on fixtures, with no spend. Use real keys only when you are changing a prompt or a provider integration, and say so in your PR.

`pnpm db:seed <your-client-id>` gives you a completed interview and report to look at (your id is in DevTools → Application → Local Storage → `interviewiq-client-id`).

## Where things are

- [ARCHITECTURE.md](ARCHITECTURE.md) is the authoritative description of the system: pipeline, SSE protocol, state machine, process model.
- [docs/design-system.md](docs/design-system.md) defines the UI. **UI changes must follow it** (tokens, tile language, type, pastel meanings).
- [docs/FEATURES.md](docs/FEATURES.md) is the feature backlog.
- `docs/history/` holds planning-era documents. Useful background, but they may not match the code.

## Conventions

- **Keep routes thin.** A route handler validates input (Zod schemas from `packages/types`), applies a rate limit, checks session ownership, and calls one function in `packages/ai`. Business logic belongs in `packages/ai/src` (`interview/` for the live interview, `services/` for the rest).
- **Server-authoritative state.** Interview state lives in Postgres and reaches the browser as SSE events; Zustand is for UI state only.
- **Single process.** In-memory singletons (SSE registry, TTS cache, rate limiter, orchestrator locks) assume one Node process. Do not add features that need more than one without discussing it first.
- **No secrets or provider internals to the client.** Throw `AppError` with a code from `ErrorCode` (`packages/types`); routes answer with `apiError(err)`, which returns `{ error: { code, message, retryable } }`. The browser localizes by `code`; details go to the server log.
- **Prompts** return JSON validated with Zod, with fallbacks. Treat CVs, job descriptions and transcripts as untrusted data.
- Database changes: edit `packages/db/prisma/schema.prisma` and run `pnpm db:push` (the project uses `db push`, not migrations).
- Formatting: Prettier config is in the repo. Format the files you touch; do not reformat unrelated code in the same PR.

### Adding UI text (i18n)

1. Add the key to the English dictionary in `apps/web/lib/i18n/dictionaries/en/<namespace>.ts`. English is the source of truth.
2. Add the same key to `pt/<namespace>.ts` and `es/<namespace>.ts`. Those files are typed `typeof En`, so a missing key fails `pnpm typecheck`.
3. Read it with `useI18n()` in client components or `getServerDictionary()` in server components. No hard-coded user-facing strings.

## Branches and commits

- Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`, `docs/<short-name>`.
- Use [Conventional Commits](https://www.conventionalcommits.org/) with a scope, as in the existing history:
  - `feat(web): stop-interview flow and play-on-demand narration`
  - `fix(video): request D-ID offers on demand to stay within the stream quota`
  - `chore(deps): bump next to 15.5.29`
  - `docs: describe pause and coach feature and COACH_MODEL`
- Common scopes: `web`, `ai`, `db`, `types`, `video`, `deps`.

## Before opening a PR

Run all four; CI runs the same:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Then fill in the PR template: what changed, how you tested it (mock mode or real keys, which interview type/language, video on or off, which browser), and screenshots for UI changes.

## Review policy

- `main` is protected: every change lands through a pull request, CI (lint, typecheck, tests, build) must pass, and force-pushes are blocked.
- Only the maintainer can merge. CI on pull requests from forks runs only after the maintainer approves it, with a read-only token and no secrets.
- Pull requests that touch CI (`.github/`), dependencies (`package.json`, `pnpm-lock.yaml`, `.npmrc`), the Docker setup, `middleware.ts` or `next.config.js` get a stricter review. Explain why a new dependency is needed and keep those changes in their own pull request.
- Never commit API keys or `.env` files; secret scanning with push protection is enabled and will block the push.

## Reporting security issues

Not in public issues, please. See [SECURITY.md](SECURITY.md).
