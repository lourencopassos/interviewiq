"use client";

import { useEffect, useReducer, useCallback, useState } from "react";
import type { SessionStatus } from "@interviewiq/types";

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
  } | null;
  avatarSpeaking: boolean;
  avatarFailed: boolean;
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
      };
    }
  | { type: "avatar_stream_audio"; payload: { questionId: string } }
  | { type: "avatar_stream_failed"; payload: { reason: string } }
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
  avatarSpeaking: false,
  avatarFailed: false,
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
        transcript: null,
        evaluation: null,
        transitionMessage: null,
        audioUrl: null,
        avatarSpeaking: false,
      };

    case "audio_ready":
      return { ...state, audioUrl: action.payload.audioUrl };

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
        avatarStreamData: {
          streamId: action.payload.streamId,
          sdpOffer: action.payload.sdpOffer,
          iceServers: action.payload.iceServers,
        },
      };

    case "avatar_stream_audio":
      return { ...state, avatarSpeaking: true };

    case "avatar_stream_failed":
      return { ...state, avatarFailed: true };

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

function extensionForMimeType(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "audio/mp4" || base === "video/mp4") return "mp4";
  if (base === "audio/ogg") return "ogg";
  if (base === "audio/wav" || base === "audio/x-wav") return "wav";
  if (base === "audio/mpeg") return "mp3";
  return "webm";
}

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
      const extension = extensionForMimeType(audioBlob.type);
      formData.append("audio", audioBlob, `answer.${extension}`);

      let response: Response;
      try {
        response = await fetch(`/api/interview/${sessionId}/answer`, {
          method: "POST",
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
