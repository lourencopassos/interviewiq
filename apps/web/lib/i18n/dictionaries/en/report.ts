// Source of truth for the `report` namespace. Keep keys flat-ish and descriptive.
export const report = {
  /** Word inside the "[ report ]" bracket eyebrow on the title strip. */
  eyebrow: "report",
  loading: {
    wrappingUp: "Writing your coaching report. This takes about a minute.",
    interviewing: "The interview is still running. The report appears once it ends.",
    waiting: "Waiting for the report.",
    check: "check {n}/{total}",
  },
  fetchErrors: {
    timeout: "The report is taking longer than expected. You can try generating it again.",
    failed: "Report generation failed.",
  },
  notFound: {
    eyebrow: "[ 404 ] session not found",
    title: "There's no report here.",
    body: "This session doesn't exist or was deleted.",
    backToHistory: "Back to history",
    startNew: "Start a new interview",
  },
  errorState: {
    eyebrow: "[ report ] couldn't load",
    body: "Regenerating rebuilds the report from the recorded answers.",
    regenerateFailedTitle: "Regenerate failed",
    regenerate: "Regenerate report",
    regenerating: "Regenerating…",
    backToHistory: "Back to history",
  },
  verdict: {
    sectionLabel: "Overall result",
    eyebrow: "overall result",
    outOf: "/100",
    names: {
      "Strong Pass": "Strong pass",
      "Lean Pass": "Lean pass",
      Borderline: "Borderline",
      "No Pass": "No pass",
    },
    notes: {
      "Strong Pass": "You'd likely move forward. Keep the edge sharp.",
      "Lean Pass": "Probably a yes, with a few reservations on the table.",
      Borderline: "Could go either way. The gaps below decide it.",
      "No Pass": "Not this time. The study plan is the shortest route back.",
    },
  },
  dimensions: {
    sectionLabel: "Dimension scores",
    eyebrow: "dimensions",
    tagline: "four scores out of 100",
    overall: "overall",
    names: {
      technical: "Technical",
      problemSolving: "Problem solving",
      communication: "Communication",
      behavioral: "Behavioral",
    },
  },
  summary: {
    sectionLabel: "Summary",
    eyebrow: "summary",
    tagline: "the short version",
  },
  cultureFit: {
    sectionLabel: "Culture fit",
    eyebrow: "culture fit",
    at: "at {company}",
  },
  strengths: {
    sectionLabel: "Strengths",
    eyebrow: "strengths",
    tagline: "what landed",
    empty: "Nothing stood out as a strength this time.",
  },
  improvements: {
    sectionLabel: "Areas to improve",
    eyebrow: "areas to improve",
    tagline: "fix these first",
    empty: "No gaps worth a line. Keep doing what you did.",
    priority: { high: "high", medium: "medium", low: "low" },
  },
  studyPlan: {
    sectionLabel: "Study plan",
    eyebrow: "study plan",
    tagline: "ordered by what moves your score most",
    totalHours: "{n}h total",
    hours: "{n}h",
    whyItMatters: "why it matters",
    resources: "resources",
    practicePrompt: "practice prompt",
    resourceType: { book: "book", course: "course", practice: "practice", article: "article" },
  },
  questionReview: {
    sectionLabel: "Question review",
    eyebrow: "question review",
    tagline: "your words next to the notes",
    answered: "{n} answered",
    /** Short prefix before the zero-padded question number: q01, q02… */
    questionPrefix: "q",
    youSaid: "you said",
    interviewerNotes: "interviewer's notes",
    strengths: "strengths",
    gaps: "gaps",
  },
  coach: {
    /** Pill next to a question the candidate asked the coach about before answering. */
    coached: "coached",
    whatYouAsked: "what you asked",
    highlighted: "highlighted",
    /** Title-strip pill when the session ran with the coach disabled. */
    coachOff: "coach off",
    model: "model",
  },
  nextTips: {
    sectionLabel: "Tips for your next interview",
    eyebrow: "next time",
    tagline: "walk in with these",
  },
  retake: {
    eyebrow: "retake readiness",
    days: "{n} days",
    tail: "of focused study before the next attempt",
  },
  actions: {
    practiceAgain: "Practice again",
    exportPdf: "Export PDF",
    history: "History",
  },
};
