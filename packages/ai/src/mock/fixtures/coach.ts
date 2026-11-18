// Canned coach answers for mock mode, chosen by what the candidate highlighted.

const ANSWERS: Array<{ match: RegExp; answer: string }> = [
  {
    match: /reconcil|virtual dom|fiber/i,
    answer:
      "Reconciliation is React's diffing step: after a state change it builds a new element tree and compares it with the previous one to find the minimal set of DOM updates. Two heuristics keep that linear instead of cubic: elements of different types produce different subtrees, and keys tell React which list items are the same across renders. A strong answer names those two rules, mentions that Fiber lets the work be split and paused, and gives one concrete consequence, such as why index keys cause bugs when a list is reordered.",
  },
  {
    match: /undo|redo|form|state/i,
    answer:
      "The interviewer wants to hear a data structure, not a library. Undo/redo is usually a history stack: past states, the present state, and a future stack that fills when you undo. Each form action pushes the previous state onto the past. Name the trade-off too: snapshots are simple but cost memory, so for large forms you store diffs or use structural sharing. If you mention useReducer, say why: one reducer makes every transition explicit and replayable.",
  },
];

const DEFAULT =
  "Break the question into what it is really testing. Interviewers rarely want a definition; they want to see you reason from a concrete example to a general rule, then name one trade-off. Start with a one-sentence direct answer, then the example, then the trade-off. If part of the question is unclear, say which part and make a reasonable assumption out loud.";

export function getMockCoachAnswer(selection: string | undefined, prompt: string | undefined): string {
  const haystack = `${selection ?? ""} ${prompt ?? ""}`;
  return ANSWERS.find((a) => a.match.test(haystack))?.answer ?? DEFAULT;
}
