"use client";

import { useEffect, useReducer, useCallback, useState } from "react";
import {
  interviewEventSchema,
  normalizeAudioMimeType,
  type InterviewEvent,
  type InterviewEventOf,
  type SessionStatus,
} from "@interviewiq/types";
import { getClientId } from "@/lib/client-id";
import { apiRequest } from "@/lib/api-client";
import { useLatest } from "@/hooks/useLatest";

type EventData<T extends InterviewEvent["type"]> = InterviewEventOf<T>["data"];

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "error";

/** Client mirror of the server's interview state, built only from SSE events. */
export interface InterviewStreamState {
  status: SessionStatus | null;
  currentQuestion: EventData<"question_ready"> | null;
  audioUrl: string | null;
  transcript: string | null;
  evaluation: Omit<EventData<"evaluation_complete">, "questionId"> | null;
  transitionMessage: string | null;
  stageTransition: EventData<"stage_transition"> | null;
  avatarStreamData: EventData<"avatar_stream_ready"> | null;
  /** Code from the last `avatar_stream_failed`; null while video mode is healthy. */
  avatarFailureCode: EventData<"avatar_stream_failed">["code"] | null;
  redirectTo: string | null;
  connectionStatus: ConnectionStatus;
  /** Last server `error` event. Rendered by code; `message` is for logs. */
  error: EventData<"error"> | null;
}

/** Every validated SSE event, plus the hook's own connection bookkeeping. */
type StreamAction =
  | InterviewEvent
  | { type: "clear_error" }
  | { type: "connection_open" }
  | { type: "connection_reset" }
  | { type: "connection_error"; exhausted: boolean };

const initialState: InterviewStreamState = {
  status: null,
  currentQuestion: null,
  audioUrl: null,
  transcript: null,
  evaluation: null,
  transitionMessage: null,
  stageTransition: null,
  avatarStreamData: null,
  avatarFailureCode: null,
  redirectTo: null,
  connectionStatus: "connecting",
  error: null,
};

function streamReducer(state: InterviewStreamState, action: StreamAction): InterviewStreamState {
  switch (action.type) {
    case "state_change":
      return { ...state, status: action.data.status };

    case "question_ready":
      return {
        ...state,
        currentQuestion: action.data,
        error: state.error?.code === "START_FAILED" ? null : state.error,
        transcript: null,
        evaluation: null,
        transitionMessage: null,
        audioUrl: null,
      };

    case "audio_ready":
      return state.currentQuestion?.questionId === action.data.questionId
        ? { ...state, audioUrl: action.data.audioUrl }
        : state;

    case "transcription_complete":
      return { ...state, transcript: action.data.transcript };

    case "evaluation_complete":
      return { ...state, evaluation: { score: action.data.score, tier: action.data.tier } };

    case "transition_text":
      return { ...state, transitionMessage: action.data.message };

    case "stage_transition":
      return { ...state, stageTransition: action.data };

    case "interview_complete":
      return { ...state, redirectTo: action.data.redirectTo };

    case "avatar_stream_ready":
      return { ...state, avatarFailureCode: null, avatarStreamData: action.data };

    case "avatar_stream_failed":
      return { ...state, avatarFailureCode: action.data.code };

    case "avatar_stream_audio":
      return state;

    case "error":
      return { ...state, error: action.data };

    case "clear_error":
      return { ...state, error: null };

    case "connection_open":
      return { ...state, connectionStatus: "connected" };

    case "connection_reset":
      return { ...state, connectionStatus: "connecting" };

    case "connection_error":
      return { ...state, connectionStatus: action.exhausted ? "error" : "reconnecting" };
  }
}

/** Parse one SSE frame against the shared protocol; invalid frames are dropped. */
function parseEvent(raw: string): InterviewEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    console.warn("Ignoring a non-JSON SSE frame:", raw);
    return null;
  }
  const parsed = interviewEventSchema.safeParse(json);
  if (!parsed.success) {
    console.warn(
      "Ignoring an SSE frame that does not match the event protocol:",
      parsed.error.issues,
      json,
    );
    return null;
  }
  return parsed.data;
}

const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * One EventSource per interview session (with capped exponential reconnect).
 * Every valid event updates the mirrored state and is also handed to
 * `onEvent`, so callers can react to the event itself (start a recording
 * phase, connect the avatar) instead of watching state for changes.
 */
export function useInterviewStream(sessionId: string, onEvent?: (event: InterviewEvent) => void) {
  const [state, dispatch] = useReducer(streamReducer, initialState);
  const onEventRef = useLatest(onEvent);
  // Bumping this value tears down the current EventSource and opens a new one
  // with a fresh reconnect budget.
  const [connectionNonce, setConnectionNonce] = useState(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function connect() {
      if (disposed) return;
      // EventSource can't send headers: make sure the client-id cookie exists first.
      getClientId();
      eventSource = new EventSource(`/api/interview/${sessionId}/stream`);

      eventSource.onopen = () => {
        reconnectAttempts = 0;
        dispatch({ type: "connection_open" });
      };

      eventSource.onmessage = (message: MessageEvent<string>) => {
        const event = parseEvent(message.data);
        if (!event) return;
        dispatch(event);
        onEventRef.current?.(event);
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (disposed) return;

        reconnectAttempts++;
        const exhausted = reconnectAttempts > MAX_RECONNECT_ATTEMPTS;
        dispatch({ type: "connection_error", exhausted });

        if (!exhausted) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 16000);
          reconnectTimeout = setTimeout(connect, delay);
        }
      };
    }

    dispatch({ type: "connection_reset" });
    connect();

    return () => {
      disposed = true;
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [sessionId, connectionNonce, onEventRef]);

  /** Dismiss the last server-side error. */
  const clearError = useCallback(() => {
    dispatch({ type: "clear_error" });
  }, []);

  /** Reset the reconnect budget and reopen the SSE connection. */
  const reconnect = useCallback(() => {
    setConnectionNonce((n) => n + 1);
  }, []);

  /** Upload an answer. Results arrive as SSE events; throws ApiError / NetworkError. */
  const submitAnswer = useCallback(
    async (audioBlob: Blob) => {
      const formData = new FormData();
      const { extension } = normalizeAudioMimeType(audioBlob.type);
      formData.append("audio", audioBlob, `answer.${extension}`);
      await apiRequest(`/api/interview/${sessionId}/answer`, { method: "POST", body: formData });
    },
    [sessionId],
  );

  return { ...state, submitAnswer, reconnect, clearError };
}
