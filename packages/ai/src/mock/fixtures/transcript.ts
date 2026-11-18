// Canned transcripts that rotate per session.
// Realistic interview answer content for different question types.

const MOCK_TRANSCRIPTS: string[] = [
  "So React's reconciliation works by comparing the previous virtual DOM tree with the new one whenever state changes. When you call setState, React creates a new virtual DOM representation and diffs it against the previous one. It identifies the minimal set of changes needed and batches those DOM updates together. The key insight is that instead of replacing the entire DOM, it only touches what actually changed. React uses a heuristic algorithm that assumes elements of different types will produce different trees, which lets it run in O(n) instead of O(n cubed). In newer versions with the fiber architecture, React can also pause and resume this work, which enables features like concurrent rendering and Suspense.",

  "For the complex form state, I'd probably reach for useReducer since we need undo/redo, which maps perfectly to the command pattern. Each form action becomes a command object that I push onto a history stack. Undo just pops the stack and replays. For the nested fields, I'd normalize the state structure using a flat map keyed by field path, like 'address.street'. Validation would run through a schema validator like Zod on each change, but debounced to avoid hammering the validator on every keystroke. I'd keep validation results in a separate slice of state so they don't trigger unnecessary re-renders of the form fields themselves.",

  "There was a time at my previous company where a staff engineer proposed migrating our entire frontend from REST to GraphQL. I had concerns because our team was small, only four frontend developers, and nobody had production GraphQL experience. I didn't push back in the meeting because I wanted to be respectful, but afterward I put together a document comparing the migration effort with the actual pain points we were experiencing with REST. I showed that most of our issues were around API versioning, which we could solve with a simpler approach. I shared it with the team and the staff engineer actually appreciated the analysis. We ended up implementing a lighter solution that addressed the real problems without the migration risk.",

  "When debugging a slow React app, I start by opening the React DevTools Profiler and recording a session while reproducing the sluggishness. I look for components that re-render frequently or take a long time to render. The flame chart shows me exactly where time is spent. Common culprits are components re-rendering because parent state changed even though their props didn't. For those, React.memo with proper comparison helps. I also check for expensive computations that should be memoized with useMemo. Beyond React-specific tools, I use Chrome DevTools Performance tab to check for layout thrashing and long tasks blocking the main thread.",

  "To me, good engineering culture starts with psychological safety. People need to feel comfortable asking questions, admitting mistakes, and proposing ideas without fear of judgment. At my last team, I started weekly show and tell sessions where anyone could demo what they'd been working on, including failures and lessons learned. That really opened things up. I also believe in strong code review culture, not as a gatekeeping mechanism but as a learning opportunity. I try to leave reviews that explain the why behind suggestions, not just the what. And I make a point to publicly celebrate when someone ships something impactful or helps a teammate.",
];

// Per-session counter to rotate through transcripts
declare global {
  // eslint-disable-next-line no-var
  var __mockTranscriptCounter: Map<string, number> | undefined;
}

function getTranscriptCounter(): Map<string, number> {
  if (!globalThis.__mockTranscriptCounter) {
    globalThis.__mockTranscriptCounter = new Map();
  }
  return globalThis.__mockTranscriptCounter;
}

export function getNextMockTranscript(sessionId?: string): string {
  const key = sessionId ?? "default";
  const counter = getTranscriptCounter();
  const index = counter.get(key) ?? 0;
  counter.set(key, index + 1);
  return MOCK_TRANSCRIPTS[index % MOCK_TRANSCRIPTS.length];
}
