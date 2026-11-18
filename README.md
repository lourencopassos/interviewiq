# InterviewIQ

AI-powered mock interviews you run on your own machine.

Paste a job description. InterviewIQ parses it, researches the company, and runs an adaptive **voice interview**: an AI interviewer asks questions out loud, you answer with your microphone, each answer is scored in real time, and weak answers get follow-ups. At the end you get a coaching report with dimension scores, strengths, gaps, a prioritized study plan, and tips for the real thing.

It is self-hosted and bring-your-own-keys. Nothing is sent anywhere except the AI providers you configure.

- **Interviewer:** Anthropic Claude (configurable model, default `claude-sonnet-5`)
- **Speech to text:** OpenAI Whisper
- **Text to speech:** ElevenLabs
- **Optional video interviewer:** D-ID real-time avatar over WebRTC

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the real-time pipeline works.

## Features

- Job description parsing into skills, seniority, domain and interview focus
- Company research with web search, cached for a week per company
- Adaptive question flow: follow-ups when an answer scores under 65, skips of easy questions after a very strong answer
- Interview types: phone screen, technical, behavioral, system design, and **Full Loop** (all four stages in one session with spoken transitions)
- Difficulty levels junior to staff, in English or Brazilian Portuguese
- Optional resume/CV text so questions reference your background
- Coaching report with verdict, four dimension scores, study plan with resources, per-question review, and PDF export via print
- Session history, resume of interrupted interviews, and refresh-safe state (everything authoritative lives in Postgres)
- **Mock mode** for development: the whole interview loop runs with canned fixtures and no paid API calls

## Requirements

- Node.js 20 or newer
- pnpm 9 (`corepack enable` will pick up the pinned version)
- Docker, for the local Postgres container
- API keys: Anthropic, OpenAI, ElevenLabs. D-ID is optional and only needed for video mode.

## Quick start

```bash
git clone https://github.com/lourencopassos/interviewq.git
cd interviewq
pnpm install

cp .env.example apps/web/.env.local
cp .env.example packages/db/.env
# edit apps/web/.env.local and add your API keys

pnpm db:setup      # starts Postgres (host port 5436) and pushes the schema
pnpm db:seed       # optional: one completed sample interview for the history page
pnpm dev           # http://localhost:3000
```

Open `http://localhost:3000/new`, paste a job description, pick the interview type, and start. Your browser will ask for microphone access.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | All prompts and company web search |
| `OPENAI_API_KEY` | yes | Whisper transcription of your answers |
| `ELEVENLABS_API_KEY` | yes | Interviewer voice |
| `DATABASE_URL` | yes | Postgres connection string. Default matches `docker-compose.yml`. |
| `CLAUDE_MODEL` | no | Override the Claude model id. Default `claude-sonnet-5`. |
| `DID_API_KEY` | no | Enables the video interviewer |
| `DID_PRESENTER_URL` | no | Portrait image for the avatar. Defaults to a public D-ID sample. |

`apps/web/.env.local` is read by the app. `packages/db/.env` only needs `DATABASE_URL` and is used by the Prisma CLI.

### Mock mode (no API spend)

In development a small toggle appears in the bottom-left corner of every page. Turn it on and the interview routes use canned questions, evaluations and a silent audio placeholder, with the browser's own speech synthesis reading questions aloud. Job parsing and company research still call the real APIs so you can test those separately.

Mock mode is a cookie scoped to your browser and is ignored in production builds.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start every workspace in dev mode |
| `pnpm build` | Production build of all packages and the web app |
| `pnpm lint` | ESLint over the web app |
| `pnpm db:up` / `pnpm db:down` | Start or stop the Postgres container |
| `pnpm db:setup` | Start Postgres and push the schema (first run) |
| `pnpm db:push` | Push schema changes after editing `schema.prisma` |
| `pnpm db:seed` | Insert the demo session |
| `pnpm db:studio` | Open Prisma Studio |

## Project layout

```
apps/web          Next.js 15 app: pages, hooks, thin API routes
packages/ai       Prompts, interview orchestrator, audio/avatar pipelines, caches, SSE, mock mode
packages/types    Shared Zod schemas, enums and the SSE event protocol
packages/db       Prisma schema, client singleton, seed
packages/ui       Shared utilities for shadcn-style components
docs/             Product spec and the phase-by-phase implementation guides
```

## Running it somewhere other than your laptop

The app is built to run as **one long-lived Node process** (`next start`, or the standalone output in a container) next to a Postgres database. Live SSE connections, generated audio clips and rate-limit counters are kept in process memory and expire on their own. Interview state itself is always in Postgres, so a restart is safe: the browser reconnects and the current question is replayed.

That design does **not** fit multi-instance serverless hosting such as Vercel functions, where the SSE stream, the answer upload and the audio fetch can land on different instances. If you want to deploy that way you would need to move audio blobs to object storage and SSE fan-out to a pub/sub layer. There is no authentication; sessions are tied to an anonymous id stored in the browser. Treat a public deployment as a demo, not a product.

## Costs

Every interview makes real API calls: one Claude call per question set, one per answer, one for the report, one Whisper call per answer, and one ElevenLabs call per spoken line. Full Loop runs four question sets and 15 to 20 answers. Use mock mode while developing.

## Contributing

Issues and pull requests are welcome. Please run `pnpm lint` and `pnpm build` before opening a PR. The implementation notes in `docs/` and `agents.md` describe the intended behaviour of each part of the system.

## License

[MIT](LICENSE)
