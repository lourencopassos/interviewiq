// Source of truth for the `errors` namespace. Keep keys flat-ish and descriptive.
export const errors = {
  /** Reference line under an error message: the Next.js error digest. */
  ref: "ref {digest}",
  global: {
    eyebrow: "[ error ] something broke",
    title: "That didn't go as planned.",
    body: "An unexpected error stopped this page. Trying again usually fixes it.",
    tryAgain: "Try again",
    goHome: "Go home",
  },
  notFound: {
    eyebrow: "[ 404 ] not found",
    title: "Nothing lives at this address.",
    body: "The page may have moved, or the link was never right.",
    goHome: "Go home",
    startInterview: "Start an interview",
  },
  report: {
    eyebrow: "[ report ] unavailable",
    title: "This report didn't load.",
    body: "It may still be generating, or the session may no longer exist.",
    backToHistory: "Back to history",
  },
};
