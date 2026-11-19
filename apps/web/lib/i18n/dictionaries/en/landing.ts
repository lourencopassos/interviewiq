export const landing = {
  meta: {
    title: "InterviewIQ — Mock interviews that know the company",
    description:
      "Paste a job description, get an adaptive voice interview from an AI that researched the company, and walk away with a coaching report and study plan.",
  },
  hero: {
    eyebrow: "practice · score · study",
    titleA: "Interview like it's the real one.",
    titleB: "Then read",
    titleMark: "the debrief.",
    body: "Paste a job description. An interviewer who has researched the company asks you questions out loud, scores every answer, and digs in when you're vague. You leave with a report and a study plan.",
    start: "Start an interview",
    history: "Past sessions",
    facts: [
      ["Runs on", "your machine"],
      ["Voices", "Claude · Whisper · ElevenLabs"],
      ["Languages", "EN · PT-BR · ES"],
    ],
    demoCaption: "A scripted preview. Real sessions run on your keys.",
  },
  demo: {
    live: "Live · Senior Frontend · Northwind Labs",
    interviewer: "Interviewer",
    you: "you",
    followUp: "follow-up",
    listening: "listening",
    recordingAnswer: "Recording answer",
    waiting: "Waiting for the question to finish…",
    transcribed: "Answer transcribed · 48s",
    record: "record",
    replay: "replay",
    rule: "score < 65 → follow-up",
    script: [
      {
        question: "Northwind's analytics dashboard renders thousands of rows. Where does React start to hurt, and what would you reach for first?",
        feedback: "Good instinct to measure before memoizing.",
      },
      {
        question: "You said virtualization. How do you keep keyboard navigation and screen readers working inside a virtualized table?",
        feedback: "Let's dig into the accessibility piece.",
        followUp: "Walk me through what aria-rowindex buys you here.",
      },
      {
        question: "Tell me about a time you pushed back on a design decision and were wrong.",
        feedback: "Specific, honest, and you named what changed.",
      },
    ],
  },
  steps: {
    eyebrow: "how a session runs",
    title: "Three steps, one sitting.",
    hintRecord: "record",
    hintReplay: "replay the question",
    stepLabel: "step",
    items: [
      {
        title: "Paste the posting",
        body: "The role, the stack and the seniority are pulled out of the text. Then the interviewer reads up on the company: culture, process, recent news.",
        meta: "~40s",
      },
      {
        title: "Talk it through",
        body: "Questions are spoken aloud. You answer with your voice. Each answer is scored on the spot, and a weak one earns a follow-up instead of a free pass.",
        meta: "15–25 min",
      },
      {
        title: "Read the debrief",
        body: "A verdict, four dimension scores, what landed, what didn't, and a study plan ordered by what would move your score most.",
        meta: "yours to keep",
      },
    ],
  },
  rules: {
    eyebrow: "what the interviewer adapts",
    title: "It listens to how you're doing.",
    items: [
      { label: "score < 65", title: "Follow-up", body: "The interviewer asks a second question on the same topic before moving on." },
      { label: "score > 88", title: "Skip ahead", body: "An easy question next in line gets dropped. Strong answers buy harder ones." },
      { label: "full loop", title: "Four stages", body: "Phone screen, technical, behavioral, system design, with spoken transitions between them." },
      { label: "web search", title: "Knows the company", body: "Questions reference the real stack and culture, not a generic template." },
    ],
  },
  report: {
    eyebrow: "the debrief",
    title: "A report you can actually act on.",
    body: "Every session ends with a verdict and four dimension scores, then the parts that matter: what you did well, what to fix first, a study plan with real resources, and a per-question review with your transcript next to the interviewer's notes.",
    chips: ["Strengths", "Areas to improve", "Study plan", "Question review", "Retake readiness"],
    sampleLabel: "Coaching report · sample",
    verdict: "Lean Pass",
    overall: "overall",
    dims: ["Technical", "Problem solving", "Communication", "Behavioral"],
    fixFirst: "Fix first",
    fixFirstBody: "Accessibility in virtualized lists · 3h · one practice prompt included",
  },
  cta: {
    eyebrow: "ready when you are",
    title: "Your next interview is a paste away.",
    button: "Start an interview",
  },
  footer: {
    line: "InterviewIQ · MIT licensed · self-hosted, bring your own API keys",
    source: "Source on GitHub",
  },
};
