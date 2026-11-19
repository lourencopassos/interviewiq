"use client";

import { useEffect, useReducer, useCallback, useState } from "react";
import {
  normalizeAudioMimeType,
  type AvatarFailureCode,
  type SessionStatus,
} from "@interviewiq/types";
import { clientHeaders, getClientId } from "@/lib/client-id";

interface InterviewState {
  status: SessionStatus | null;
  currentQuestion: {
    questionId: string;
    text: string;
    category: string;
    order: number;
    total: number;
    isFollowUp?: boolean;
  } | null;
  audioUrl: string | null;
  transcript: string | null;
  evaluation: { score: number; tier: string } | null;
  transitionMessage: string | null;
  stageTransition: {
    completedStage: string;
    stageScore: number;
    nextStage: string;
    transitionAudioUrl: string;
  } | null;
  currentStage: string | null;
  avatarStreamData: {
    streamId: string;
    sdpOffer: RTCSessionDescriptionInit;
    iceServers: RTCIceServer[];
    presenterUrl?: string;
  } | null;
  avatarFailed: boolean;
  /** Stable code from the last `avatar_stream_failed` event, mapped to copy by the page. */
  avatarFailureCode: AvatarFailureCode | null;
  isComplete: boolean;
  redirectTo: string | null;
  connectionStatus: "connecting" | "connected" | "reconnecting" | "error";
  error: { code: string; message: string; retryable: boolean } | null;
}

type InterviewAction =
  | { type: "state_change"; payload: { status: SessionStatus } }
  | {
      type: "question_ready";
      payload: {
        questionId: string;
        text: string;
        category: string;
        order: number;
        total: number;
      };
    }
  | { type: "audio_ready"; payload: { questionId: string; audioUrl: string } }
  | {
      type: "transcription_complete";
      payload: { questionId: string; transcript: string };
    }
  | {
      type: "evaluation_complete";
      payload: { questionId: string; score: number; tier: string };
    }
  | { type: "transition_text"; payload: { message: string } }
  | {
      type: "stage_transition";
      payload: {
        completedStage: string;
        stageScore: number;
        nextStage: string;
        transitionAudioUrl: string;
      };
    }
  | {
      type: "interview_complete";
      payload: { sessionId: string; redirectTo: string };
    }
  | {
      type: "avatar_stream_ready";
      payload: {
        sessionId: string;
        streamId: string;
        sdpOffer: RTCSessionDescriptionInit;
        iceServers: RTCIceServer[];
        presenterUrl?: string;
      };
    }
  | { type: "avatar_stream_failed"; payload: { code?: AvatarFailureCode; reason: string } }
  | {
      type: "error";
      payload: { code: string; message: string; retryable: boolean };
    }
  | { type: "clear_error" }
  | { type: "connection_open" }
  | { type: "connection_reset" }
  | { type: "connection_error"; payload: { exhausted: boolean } };

const initialState: InterviewState = {
  status: null,
  currentQuestion: null,
  audioUrl: null,
  transcript: null,
  evaluation: null,
  transitionMessage: null,
  stageTransition: null,
  currentStage: null,
  avatarStreamData: null,
  avatarFailed: false,
  avatarFailureCode: null,
  isComplete: false,
  redirectTo: null,
  connectionStatus: "connecting",
  error: null,
};

function interviewReducer(
  state: InterviewState,
  action: InterviewAction,
): InterviewState {
  switch (action.type) {
    case "state_change":
      return { ...state, status: action.payload.status };

    case "question_ready":
      return {
        ...state,
        currentQuestion: action.payload,
        error: state.error?.code === "START_FAILED" ? null : state.error,
        transcript: null,
        evaluation: null,
        transitionMessage: null,
        audioUrl: null,
      };

    case "audio_ready":
      return state.currentQuestion?.questionId === action.payload.questionId
        ? { ...state, audioUrl: action.payload.audioUrl }
        : state;

    case "transcription_complete":
      return { ...state, transcript: action.payload.transcript };

    case "evaluation_complete":
      return {
        ...state,
        evaluation: {
          score: action.payload.score,
          tier: action.payload.tier,
        },
      };

    case "transition_text":
      return { ...state, transitionMessage: action.payload.message };

    case "stage_transition":
      return {
        ...state,
        stageTransition: action.payload,
        currentStage: action.payload.nextStage,
      };

    case "interview_complete":
      return {
        ...state,
        isComplete: true,
        redirectTo: action.payload.redirectTo,
      };

    case "avatar_stream_ready":
      return {
        ...state,
        avatarFailed: false,
        avatarFailureCode: null,
        avatarStreamData: {
          streamId: action.payload.streamId,
          sdpOffer: action.payload.sdpOffer,
          iceServers: action.payload.iceServers,
          presenterUrl: action.payload.presenterUrl,
        },
      };

    case "avatar_stream_failed":
      return { ...state, avatarFailed: true, avatarFailureCode: action.payload.code ?? "AVATAR_UNAVAILABLE" };

    case "error":
      return { ...state, error: action.payload };

    case "clear_error":
      return { ...state, error: null };

    case "connection_open":
      return { ...state, connectionStatus: "connected" };

    case "connection_reset":
      return { ...state, connectionStatus: "connecting" };

    case "connection_error":
      return {
        ...state,
        connectionStatus: action.payload.exhausted ? "error" : "reconnecting",
      };

    default:
      return state;
  }
}

const MAX_RECONNECT_ATTEMPTS = 5;

export function useInterviewStream(sessionId: string) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);
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

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          dispatch({ type: data.type, payload: data.data });
        } catch {
          console.warn("Failed to parse SSE event:", event.data);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (disposed) return;

        reconnectAttempts++;
        const exhausted = reconnectAttempts > MAX_RECONNECT_ATTEMPTS;
        dispatch({ type: "connection_error", payload: { exhausted } });

        if (!exhausted) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts - 1),
            16000,
          );
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
  }, [sessionId, connectionNonce]);

  /** Dismiss the last server-side error. */
  const clearError = useCallback(() => {
    dispatch({ type: "clear_error" });
  }, []);

  /** Reset the reconnect budget and reopen the SSE connection. */
  const reconnect = useCallback(() => {
    setConnectionNonce((n) => n + 1);
  }, []);

  const submitAnswer = useCallback(
    async (audioBlob: Blob) => {
      const formData = new FormData();
      const { extension } = normalizeAudioMimeType(audioBlob.type);
      formData.append("audio", audioBlob, `answer.${extension}`);

      let response: Response;
      try {
        response = await fetch(`/api/interview/${sessionId}/answer`, {
          method: "POST",
          headers: clientHeaders(),
          body: formData,
        });
      } catch {
        throw new Error("Network error — could not upload your answer");
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : `Failed to submit answer (${response.status})`,
        );
      }
    },
    [sessionId],
  );

  return { ...state, submitAnswer, reconnect, clearError };
}
