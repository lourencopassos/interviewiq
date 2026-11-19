# Phase 5 — Polish & Launch

## Goals

18. Landing page with demo report preview and value prop
19. Loading states, error boundaries, retry logic throughout
20. Mobile-responsive layout passes (primary: desktop, functional: mobile)
21. Rate limiting on API routes (Upstash Redis or in-memory for MVP)
22. Deploy to Vercel, seed with sample session data for demo mode
23. Soft launch post in dev communities: Twitter/X, LinkedIn, Rocketseat, Discord

---

## Landing Page (`/`)

- Hero section with value proposition and CTA ("Start Practicing")
- How it works — 3-step visual: Paste Job → Interview → Get Coached
- Sample report preview (interactive or screenshot) showing score gauges, study plan
- Testimonial/social proof section (placeholder for MVP)
- Language toggle (EN / PT-BR) in header
- Footer with links

---

## UX Polish

### Loading States
- Skeleton loaders for all async data fetches
- Progress indicators during company research (multi-step: parsing → researching → ready)
- Audio loading states (TTS generating, transcription processing)
- Interview state transitions with smooth animations

### Error Boundaries
- React error boundaries wrapping major page sections
- Graceful fallbacks for:
  - AI API failures (Claude, Whisper, ElevenLabs)
  - Network disconnections during interview
  - Microphone permission denied
  - Audio playback failures
- User-friendly error messages with retry actions
- Session auto-save on error to prevent data loss

### Retry Logic
- Exponential backoff on API route failures
- Automatic retry for transient errors (network, rate limits)
- Manual retry buttons for persistent failures
- Queue management for audio transcription/synthesis

---

## Mobile Responsiveness

- **Primary target**: Desktop (interview experience optimized for desktop)
- **Functional on mobile**: All pages usable, layout adapts
- Key mobile considerations:
  - Setup page form stacks vertically
  - Interview page: simplified controls, larger touch targets for record button
  - Report page: single-column layout, collapsible sections
  - History page: card list instead of grid

---

## Rate Limiting

- Implement rate limiting on all API routes
- Options: Upstash Redis (production) or in-memory Map (MVP)
- Limits per route:
  - `/api/parse-job`: 10 req/min per client
  - `/api/research-company`: 5 req/min per client
  - `/api/generate-questions`: 5 req/min per client
  - `/api/transcribe`: 30 req/min per client (multiple per interview)
  - `/api/synthesize`: 30 req/min per client
  - `/api/evaluate-answer`: 20 req/min per client
  - `/api/generate-report`: 5 req/min per client
- Rate limit headers in responses (X-RateLimit-Limit, X-RateLimit-Remaining)

---

## Deployment

### Vercel Configuration
- Environment variables for all API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, ELEVENLABS_API_KEY)
- Build command: `turbo build`
- Output directory: `apps/web/.next`
- SQLite database file path configuration (or switch to Vercel Postgres/Turso for production)

### Seed Data
- Create sample session with completed interview and report for demo mode
- Seed script in `packages/db/seed.ts`
- Demo mode flag to show sample data on landing page

### Launch Checklist
- [ ] All API routes functional with proper error handling
- [ ] Loading states on every async operation
- [ ] Error boundaries on all pages
- [ ] Mobile responsive pass on all pages
- [ ] Rate limiting active on all API routes
- [ ] Environment variables configured on Vercel
- [ ] Seed data for demo mode
- [ ] Landing page with demo report preview
- [ ] OG meta tags and social sharing images
- [ ] Analytics (Vercel Analytics or Plausible)

---

## Implementation Checklist

- [ ] Build landing page (`/`) with hero, how-it-works, sample report preview
- [ ] Add skeleton loaders and progress indicators across all pages
- [ ] Implement React error boundaries with fallback UIs
- [ ] Add retry logic with exponential backoff to all API calls
- [ ] Mobile responsive pass on Setup, Interview, Report, and History pages
- [ ] Implement rate limiting middleware for API routes
- [ ] Configure Vercel deployment (env vars, build config)
- [ ] Create seed script with sample session data
- [ ] Add OG meta tags and social sharing configuration
- [ ] End-to-end testing of full interview flow
- [ ] Performance audit (Core Web Vitals)
- [ ] Prepare launch posts for dev communities
