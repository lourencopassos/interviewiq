// Source of truth for the `interview` namespace. Keep keys flat-ish and descriptive.
export const interview = {
  loading: {
    generating: "Generating your interview questions…",
    connecting: "Connecting to interview session…",
    notStarted: "Interview not started.",
  },
  header: {
    fallbackCompany: "Interview",
    elapsed: "Elapsed time",
  },
  connection: {
    connecting: "Connecting…",
    connected: "Connected",
    reconnecting: "Reconnecting…",
    error: "Disconnected",
    reconnect: "Reconnect",
  },
  progress: {
    label: "Question {current} of {total}",
  },
  /** Full Loop stage names, keyed by the server's InterviewStage enum. */
  stages: {
    PHONE_SCREEN: "Phone screen",
    TECHNICAL: "Technical deep dive",
    BEHAVIORAL: "Behavioral",
    SYSTEM_DESIGN: "System design",
  },
  stageTransition: {
    complete: "Stage complete",
    upNext: "Up next",
  },
  question: {
    eyebrow: "Interviewer · question {order} of {total}",
    followUp: "follow-up",
    category: {
      technical: "Technical",
      behavioral: "Behavioral",
      system_design: "System design",
      culture_fit: "Culture fit",
    },
  },
  record: {
    ready: "Record answer",
    speaking: "Listening…",
    processing: "Processing…",
    idle: "Please wait…",
    recording: "Recording",
    start: "Record answer",
    stop: "Stop recording",
  },
  waveform: {
    listening: "listening",
    interviewer: "interviewer",
    active: "Audio active: {label}",
    idle: "Audio idle",
  },
  transcript: {
    you: "you",
    youSaid: "You said",
    transcribing: "transcribing…",
    evaluating: "evaluating…",
    score: "score",
  },
  transition: {
    interviewer: "Interviewer",
  },
  avatar: {
    speaking: "Speaking…",
    listening: "Listening",
    thinking: "Processing…",
    loading: "Connecting avatar…",
    fallback: "Audio mode",
    interviewer: "AI interviewer",
  },
  selfView: {
    turnOn: "Turn on camera",
    turnOff: "Turn off camera",
  },
  shortcuts: {
    record: "record · stop",
    replay: "replay the question",
    pause: "pause · resume",
  },
  complete: {
    eyebrow: "Interview complete",
    title: "That was the last question.",
    building: "Building your report…",
  },
  alerts: {
    server: {
      title: "Something went wrong",
      newInterview: "Start a new interview",
    },
    start: {
      title: "Could not start the interview",
      retrying: "Retrying…",
      back: "Back to setup",
    },
    submit: {
      title: "Your answer was not submitted",
      retryUpload: "Retry upload",
      retrying: "Retrying…",
      recordAgain: "Record again",
    },
    mic: {
      title: "Microphone access is blocked",
      body: "Allow microphone access for this site in your browser settings, then try again.",
    },
    recording: {
      title: "Recording problem",
    },
  },
  /** Client-side failure copy. */
  errors: {
    network: "Network error — please check your connection",
    startFailed: "Failed to start interview",
    startFailedStatus: "Failed to start interview ({status})",
    submitFailed: "Failed to submit your answer",
    uploadNetwork: "Network error — could not upload your answer",
    recordStartFailed: "Could not start recording",
    recordFailed: "Recording failed — please try again",
    noMicrophone: "No microphone was found. Connect one and try again.",
  },
  /** Server `error` events with a known code; unknown codes show the server message. */
  serverErrors: {
    AUDIO_UNAVAILABLE:
      "Audio couldn't be generated for this question. Please read it and record your answer.",
    NO_QUESTION: "No current question found.",
    REPORT_FAILED:
      "We couldn't generate your report. Your answers are saved — you can retry from the report page.",
  },
  pause: {
    eyebrow: "take a breath",
    title: "Paused",
    body: "The interviewer is waiting. Nothing runs on the server while you're paused: the timer stops, recording is off, and you can read the question as long as you like.",
    noTokens: "no tokens are spent while paused",
    button: "Pause",
    resume: "Resume",
    askCoach: "Ask the coach",
  },
  coach: {
    title: "Coach",
    eyebrow: "ask about this question",
    open: "Coach",
    close: "Close coach",
    explainThis: "Explain this",
    placeholder: "Ask about the question or your answer…",
    send: "Ask",
    cancel: "Stop",
    thinking: "Thinking…",
    empty: "Highlight part of the question or your answer and choose “Explain this”, or type a question below.",
    beforeAnswer: "asked before answering · marked in the report",
    afterAnswer: "asked after answering",
    otherQuestions: "Earlier questions",
    model: "model",
    disabled: "The coach is off for this session.",
  },
  errorPage: {
    eyebrow: "Interview session",
    title: "Something went wrong",
    body: "Something went wrong during the interview. Your progress has been saved.",
    reconnect: "Reconnect",
    newInterview: "Start new interview",
  },
};
