import type { InterviewEvent } from "@interviewiq/types";
import type { UiError } from "@/lib/errors";

/**
 * The interview page's state machine: what the candidate can do right now.
 *
 * It is a pure reducer over two kinds of input, so every transition can be
 * unit tested without a browser:
 *   - SSE events from the server (`question_ready`, `transition_text`, …),
 *     the same `InterviewEvent` union the stream hook validates;
 *   - user and side-effect outcomes (`PLAY`, `RECORD`, `SUBMIT_FAILED`, …),
 *     dispatched by `useInterviewController`.
 *
 * The server stays authoritative for interview progress. This machine only
 * decides local interaction state (playing, recording, paused, which alerts
 * are open) and ignores input that is not valid in the current phase.
 *
 *   loading ─question_ready─▶ ready ─PLAY─▶ speaking ─PLAYBACK_ENDED─▶ ready
 *   ready ─RECORD─▶ starting_recording ─RECORD_STARTED─▶ recording
 *   recording ─STOP_RECORDING─▶ processing ─transition_text─▶ transition
 *   processing ─SUBMIT_FAILED / RECORD_FAILED / server error─▶ ready
 *   transition ─stage_transition─▶ stage_transition
 *   transition | stage_transition ─question_ready─▶ ready
 *   any ─interview_complete─▶ complete
 */

export type InterviewPhase =
  | "loading"
  | "ready"
  | "speaking"
  | "starting_recording"
  | "recording"
  | "processing"
  | "transition"
  | "stage_transition"
  | "complete";

/** The alert slots the page shows for client-side failures. */
export type AlertSlot = "start" | "submit" | "record" | "stop";

export interface InterviewMachineState {
  phase: InterviewPhase;
  /** Client-side hold: blocks playing and recording, freezes the timer. */
  paused: boolean;
  coachOpen: boolean;
  questionId: string | null;
  /** The current question's clip has arrived (`audio_ready`). */
  audioReady: boolean;
  /** Stage narration received at a Full Loop boundary, waiting for the next question. */
  pendingNarration: string | null;
  /** Narration to play before the current question, the first time it is played. */
  questionNarration: string | null;
  /** What a "retry" on a server error should repeat. */
  lastAction: "start" | "submit" | null;
  starting: boolean;
  stopping: boolean;
  errors: Record<AlertSlot, UiError | null>;
}

export type InterviewAction =
  | { type: "START_REQUESTED" }
  | { type: "START_OK" }
  | { type: "START_FAILED"; error: UiError }
  | { type: "PLAY" }
  | { type: "PLAYBACK_ENDED" }
  | { type: "RECORD" }
  | { type: "RECORD_STARTED" }
  /** `error` is null when the microphone is blocked: the permission alert covers it. */
  | { type: "RECORD_FAILED"; error: UiError | null }
  | { type: "STOP_RECORDING" }
  | { type: "SUBMIT" }
  | { type: "SUBMIT_FAILED"; error: UiError }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "OPEN_COACH" }
  | { type: "CLOSE_COACH" }
  | { type: "STOP_INTERVIEW" }
  | { type: "STOP_FAILED"; error: UiError }
  | { type: "DISMISS"; slot: AlertSlot };

export type MachineEvent = InterviewEvent | InterviewAction;

export const initialMachineState: InterviewMachineState = {
  phase: "loading",
  paused: false,
  coachOpen: false,
  questionId: null,
  audioReady: false,
  pendingNarration: null,
  questionNarration: null,
  lastAction: null,
  starting: false,
  stopping: false,
  errors: { start: null, submit: null, record: null, stop: null },
};

const PAUSABLE: ReadonlySet<InterviewPhase> = new Set([
  "ready",
  "speaking",
  "transition",
  "stage_transition",
]);
/** Phases a failed stop request falls back from: the audio and mic were already released. */
const INTERRUPTED_BY_STOP: ReadonlySet<InterviewPhase> = new Set([
  "speaking",
  "starting_recording",
  "recording",
]);

/** Pause is allowed whenever the candidate is not mid-recording or waiting on the pipeline. */
export const canPause = (state: InterviewMachineState) => PAUSABLE.has(state.phase);

export const canPlay = (state: InterviewMachineState) =>
  !state.paused && state.phase === "ready" && state.audioReady;

/** A written question is answerable at once, even while its audio is pending. */
export const canRecord = (state: InterviewMachineState) =>
  !state.paused && state.phase === "ready" && state.questionId !== null;

const withPhase = (state: InterviewMachineState, phase: InterviewPhase): InterviewMachineState =>
  state.phase === phase ? state : { ...state, phase };

const withError = (
  state: InterviewMachineState,
  slot: AlertSlot,
  error: UiError | null,
): InterviewMachineState => ({
  ...state,
  errors: { ...state.errors, [slot]: error },
});

function onServerEvent(state: InterviewMachineState, event: InterviewEvent): InterviewMachineState {
  if (state.phase === "complete") return state;

  switch (event.type) {
    case "question_ready":
      // A replay of the current question (reconnect) only refreshes its audio.
      if (event.data.questionId === state.questionId) return { ...state, audioReady: false };
      return {
        ...state,
        phase: "ready",
        questionId: event.data.questionId,
        audioReady: false,
        questionNarration: state.pendingNarration,
        pendingNarration: null,
      };

    case "audio_ready":
      return event.data.questionId === state.questionId ? { ...state, audioReady: true } : state;

    case "transition_text":
      return state.phase === "processing" ? withPhase(state, "transition") : state;

    case "stage_transition":
      // The opening stage intro has nothing completed and no narration of its own.
      if (event.data.completedStage === null) return state;
      return {
        ...state,
        phase: "stage_transition",
        pendingNarration: event.data.transitionAudioUrl,
      };

    case "error":
      // Missing audio still leaves the written question answerable.
      if (event.data.code === "AUDIO_UNAVAILABLE") return state;
      return state.phase === "processing" ? withPhase(state, "ready") : state;

    case "interview_complete":
      return { ...state, phase: "complete", paused: false, coachOpen: false };

    default:
      return state;
  }
}

function onAction(state: InterviewMachineState, action: InterviewAction): InterviewMachineState {
  switch (action.type) {
    case "START_REQUESTED":
      return { ...withError(state, "start", null), starting: true, lastAction: "start" };
    case "START_OK":
      return { ...state, starting: false };
    case "START_FAILED":
      return { ...withError(state, "start", action.error), starting: false };

    case "PLAY":
      return canPlay(state) ? { ...state, phase: "speaking", questionNarration: null } : state;
    case "PLAYBACK_ENDED":
      return state.phase === "speaking" ? withPhase(state, "ready") : state;

    case "RECORD":
      if (!canRecord(state)) return state;
      return {
        ...state,
        phase: "starting_recording",
        errors: { ...state.errors, record: null, submit: null },
      };
    case "RECORD_STARTED":
      return state.phase === "starting_recording" ? withPhase(state, "recording") : state;
    case "RECORD_FAILED":
      return withPhase(withError(state, "record", action.error), "ready");

    case "STOP_RECORDING":
      return state.phase === "recording" ? withPhase(state, "processing") : state;
    case "SUBMIT":
      if (state.phase !== "processing" && state.phase !== "ready") return state;
      return { ...withError(state, "submit", null), phase: "processing", lastAction: "submit" };
    case "SUBMIT_FAILED":
      return withPhase(withError(state, "submit", action.error), "ready");

    case "PAUSE":
      return !state.paused && canPause(state) ? { ...state, paused: true } : state;
    case "RESUME":
      return { ...state, paused: false, coachOpen: false };
    case "OPEN_COACH":
      if (!state.paused && !canPause(state)) return state;
      return { ...state, paused: true, coachOpen: true };
    case "CLOSE_COACH":
      return { ...state, coachOpen: false };

    case "STOP_INTERVIEW":
      if (state.stopping || state.phase === "complete") return state;
      return { ...withError(state, "stop", null), stopping: true };
    case "STOP_FAILED": {
      const failed = { ...withError(state, "stop", action.error), stopping: false };
      return INTERRUPTED_BY_STOP.has(state.phase) ? withPhase(failed, "ready") : failed;
    }

    case "DISMISS":
      return withError(state, action.slot, null);
  }
}

/** Every SSE event type. A Record (not a list) so a new event type fails to compile until it is listed. */
const SERVER_EVENT_TYPES: Record<InterviewEvent["type"], true> = {
  state_change: true,
  question_ready: true,
  audio_ready: true,
  transcription_complete: true,
  evaluation_complete: true,
  transition_text: true,
  stage_transition: true,
  interview_complete: true,
  avatar_stream_ready: true,
  avatar_stream_audio: true,
  avatar_stream_failed: true,
  error: true,
};

const isServerEvent = (event: MachineEvent): event is InterviewEvent =>
  event.type in SERVER_EVENT_TYPES;

export function phaseReducer(
  state: InterviewMachineState,
  event: MachineEvent,
): InterviewMachineState {
  return isServerEvent(event) ? onServerEvent(state, event) : onAction(state, event);
}
