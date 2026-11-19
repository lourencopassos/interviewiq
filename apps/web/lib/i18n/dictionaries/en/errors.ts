import type { ErrorCode } from "@interviewiq/types";
import type { ClientErrorCode } from "@/lib/errors";

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
  /** MISSING_API_KEY when the server says which provider: names the env var to set. */
  missingApiKey: "{envVar} is not set. Add it to apps/web/.env.local or turn on mock mode.",
  /** Copy for every server error code (API bodies, SSE `error` events, coach errors). */
  api: {
    INVALID_JSON: "The request couldn't be read. Reload the page and try again.",
    INVALID_REQUEST: "Some of the details sent were invalid. Check them and try again.",
    INVALID_MULTIPART: "The recording couldn't be uploaded. Please record again.",
    NO_AUDIO: "No recording was received. Please record your answer again.",
    EMPTY_AUDIO: "The recording was empty. Check your microphone and record again.",
    TOO_LARGE: "That recording is too long to upload. Try a shorter answer.",
    CLIENT_ID_REQUIRED: "This browser couldn't be identified. Reload the page and try again.",
    UNSUPPORTED_MEDIA_TYPE:
      "The request was sent in an unsupported format. Reload the page and try again.",
    CROSS_SITE: "Requests from other sites are blocked. Open InterviewIQ directly and try again.",
    FORBIDDEN: "This session belongs to another browser.",
    RATE_LIMITED: "Too many requests. Wait a moment and try again.",
    SESSION_NOT_FOUND: "This session doesn't exist or was deleted.",
    NOT_FOUND: "That couldn't be found.",
    NOT_INTERVIEWING: "This interview isn't accepting answers right now.",
    ABANDONED: "This interview was stopped and can't be resumed.",
    ALREADY_COMPLETED: "This interview is already complete.",
    NOT_FINISHED: "Finish the interview before generating a report.",
    ANSWER_IN_FLIGHT: "Your previous answer is still being processed.",
    COACH_DISABLED: "The coach is off for this session.",
    NO_AVATAR_STREAM: "The video interviewer isn't connected.",
    NO_QUESTION: "No current question found.",
    NO_ANSWERS: "There are no answers to build a report from yet.",
    MISSING_API_KEY:
      "A provider API key is not configured. Add it to apps/web/.env.local or turn on mock mode.",
    UPSTREAM_RATE_LIMITED: "The AI provider is rate limiting requests. Please try again shortly.",
    EMPTY_QUESTION_SET:
      "The interviewer couldn't generate questions for this role. Please try again.",
    AUDIO_UNAVAILABLE:
      "Audio couldn't be generated for this question. Please read it and record your answer.",
    AVATAR_UNAVAILABLE: "The video interviewer is unavailable. Continuing with audio.",
    AVATAR_QUOTA: "The video service is at its concurrent stream limit. Continuing with audio.",
    AVATAR_NO_CREDITS: "The video service account has no credits left. Continuing with audio.",
    PARSE_FAILED: "Failed to parse the job description. Please try again.",
    START_FAILED: "Failed to start the interview. Please try again.",
    ANSWER_FAILED: "Your answer couldn't be processed. Please try again.",
    REPORT_FAILED:
      "We couldn't generate your report. Your answers are saved — you can retry from the report page.",
    COACH_FAILED: "The coach is unavailable right now.",
    INTERNAL_ERROR: "Something went wrong. Please try again.",
  } satisfies Record<ErrorCode, string>,
  /** Failures that happen in the browser (see lib/errors.ts). */
  client: {
    NETWORK: "Network error — please check your connection and try again.",
    MIC_NOT_FOUND: "No microphone was found. Connect one and try again.",
    RECORD_START_FAILED: "Could not start recording.",
    RECORD_FAILED: "Recording failed — please try again.",
    UNKNOWN: "Something went wrong. Please try again.",
  } satisfies Record<ClientErrorCode, string>,
};
