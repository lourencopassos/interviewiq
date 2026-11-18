// Source of truth for the `history` namespace. Keep keys flat-ish and descriptive.
export const history = {
  /** Word inside the "[ history ]" bracket eyebrow. */
  eyebrow: "history",
  tagline: "every session on this machine",
  title: "Past sessions",
  newInterview: "New interview",
  count: "{n}",
  countFiltered: "{n} of {total}",
  filters: {
    label: "filter",
    difficulty: "Difficulty",
    interviewType: "Interview type",
    allLevels: "All levels",
    allTypes: "All types",
    clear: "Clear filters",
  },
  card: {
    outOf: "/100",
    /** Statuses not covered by common.status, shown lowercase in the pill. */
    researching: "researching",
    resume: "Resume",
    report: "Report",
    retake: "Retake",
    confirm: "Confirm",
    deleteLabel: "Delete session",
  },
  deleteErrors: {
    network: "Network error — could not delete session",
    forbidden: "You can only delete your own sessions",
    gone: "Session no longer exists",
    status: "Failed to delete session ({status})",
    generic: "Failed to delete session",
  },
  empty: {
    eyebrow: "[ empty ]",
    body: "No interviews yet. Paste a job description and the first one takes about twenty minutes.",
    start: "Start an interview",
  },
  noMatch: {
    eyebrow: "[ no match ]",
    body: "No sessions match these filters.",
    clear: "Clear filters",
  },
};
