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
  deleteAll: {
    eyebrow: "privacy",
    body: "Sessions, CVs and transcripts are stored in this server's database. Saved jobs and your CV also live in this browser.",
    button: "Delete all my data",
    confirm: "Delete everything",
    deleting: "Deleting…",
    done: "Deleted {n} sessions from the server and cleared the CV and jobs saved in this browser.",
    failed: "Could not delete your data ({status})",
    network: "Network error — nothing was deleted",
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
