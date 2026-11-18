import type { AnswerEvaluation } from "@interviewiq/types";

// Rotating evaluations with varied scores to exercise adaptive engine behavior:
// - Score 52: triggers follow-up (< 65 threshold)
// - Score 91: triggers skip logic (> 88 threshold)
// - Others: normal progression

const MOCK_EVALUATIONS: AnswerEvaluation[] = [
  {
    score: 78,
    tier: "good",
    shortFeedback:
      "Solid explanation of React reconciliation. You covered the virtual DOM well, though diving deeper into fiber architecture would strengthen your answer.",
    followUpNeeded: false,
    followUp: null,
    keyStrengths: [
      "Clear explanation of virtual DOM diffing",
      "Good understanding of component lifecycle",
    ],
    gaps: [
      "Did not mention fiber architecture or concurrent rendering",
      "Could discuss performance implications of reconciliation",
    ],
  },
  {
    score: 52,
    tier: "poor",
    shortFeedback:
      "Your state management approach needs more structure. Let me ask a follow-up to dig deeper.",
    followUpNeeded: true,
    followUp:
      "You mentioned using useState for the form state. How would you handle the undo/redo requirement specifically? Can you walk me through the data structure you'd use?",
    keyStrengths: ["Identified the need for form validation"],
    gaps: [
      "No clear architecture for complex state",
      "Did not address undo/redo mechanism",
      "Missing discussion of performance with deeply nested state",
    ],
  },
  {
    score: 91,
    tier: "excellent",
    shortFeedback:
      "Excellent behavioral answer. Your example was specific, showed great self-awareness, and demonstrated real leadership maturity.",
    followUpNeeded: false,
    followUp: null,
    keyStrengths: [
      "Provided a specific, real-world example with clear context",
      "Demonstrated diplomatic approach to disagreement",
      "Showed growth and learning from the experience",
    ],
    gaps: [],
  },
  {
    score: 65,
    tier: "good",
    shortFeedback:
      "Decent performance debugging approach, but I'd like to see a more systematic methodology. You jumped to solutions before fully diagnosing.",
    followUpNeeded: false,
    followUp: null,
    keyStrengths: [
      "Mentioned React DevTools profiler",
      "Knows about React.memo and useMemo",
    ],
    gaps: [
      "Jumped to optimization before measurement",
      "Did not discuss Core Web Vitals or real user metrics",
      "Missing code splitting and lazy loading strategies",
    ],
  },
  {
    score: 82,
    tier: "good",
    shortFeedback:
      "Good perspective on engineering culture. Your examples of knowledge sharing sessions and mentoring were compelling.",
    followUpNeeded: false,
    followUp: null,
    keyStrengths: [
      "Concrete examples of culture-building activities",
      "Mentioned psychological safety and its importance",
      "Showed initiative in organizing knowledge sharing",
    ],
    gaps: ["Could discuss how to handle cultural conflicts or disagreements"],
  },
  {
    score: 70,
    tier: "good",
    shortFeedback:
      "Your TypeScript API client design covers the basics well. The generic approach is sound, though the error handling could be more sophisticated.",
    followUpNeeded: false,
    followUp: null,
    keyStrengths: [
      "Good use of generics for request/response typing",
      "Mentioned Zod for runtime validation",
    ],
    gaps: [
      "Error types could use discriminated unions for better narrowing",
      "Did not discuss retry strategies with exponential backoff",
      "Missing branded types for type-safe IDs",
    ],
  },
];

// Per-session counter to rotate through evaluations
declare global {
  // eslint-disable-next-line no-var
  var __mockEvalCounter: Map<string, number> | undefined;
}

function getEvalCounter(): Map<string, number> {
  if (!globalThis.__mockEvalCounter) {
    globalThis.__mockEvalCounter = new Map();
  }
  return globalThis.__mockEvalCounter;
}

export function getNextMockEvaluation(sessionId?: string): AnswerEvaluation {
  const key = sessionId ?? "default";
  const counter = getEvalCounter();
  const index = counter.get(key) ?? 0;
  counter.set(key, index + 1);
  return MOCK_EVALUATIONS[index % MOCK_EVALUATIONS.length];
}

export function resetMockEvaluations(sessionId?: string): void {
  const key = sessionId ?? "default";
  getEvalCounter().delete(key);
}
