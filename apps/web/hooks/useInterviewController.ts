"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { InterviewEvent } from "@interviewiq/types";
import { useInterviewStream } from "@/hooks/useInterviewStream";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useWebcam } from "@/hooks/useWebcam";
import { useAvatarStream } from "@/hooks/useAvatarStream";
import { useAvatarOffers } from "@/hooks/useAvatarOffers";
import { useCoach } from "@/hooks/useCoach";
import { useInterviewShortcuts } from "@/components/interview/interview-shortcuts";
import type { RecordPhase } from "@/components/interview/record-button";
import { apiFetch, apiRequest } from "@/lib/api-client";
import { ClientError, toUiError, type UiError } from "@/lib/errors";
import { getMockMode } from "@/lib/mock-mode";
import { useI18n } from "@/lib/i18n";
import {
  canPause,
  canPlay,
  canRecord,
  initialMachineState,
  phaseReducer,
  type InterviewPhase,
} from "@/lib/interview/phase-machine";

export interface SessionMeta {
  companyName: string;
  jobTitle: string;
  difficulty: string;
  videoMode: boolean;
  coachEnabled: boolean;
}

export type AvatarPhase = "speaking" | "listening" | "thinking" | "fallback" | "loading";

/** Delay between the completion screen and the redirect to the report. */
const COMPLETE_REDIRECT_MS = 2000;

/**
 * Session ids for which `/start` has already been POSTed by a mounted page.
 * Module-level so it survives React Strict Mode's unmount/remount cycle; the
 * cleanup removes the id asynchronously so a *real* remount (navigating back
 * to the interview) re-POSTs start and gets the current question re-emitted.
 */
const startedSessions = new Set<string>();

function toRecordPhase(phase: InterviewPhase): RecordPhase {
  switch (phase) {
    case "speaking":
      return "speaking";
    case "ready":
      return "ready";
    case "recording":
      return "recording";
    case "processing":
      return "processing";
    default:
      return "idle";
  }
}

function toAvatarPhase(phase: InterviewPhase, failed: boolean): AvatarPhase {
  if (failed) return "fallback";
  if (phase === "speaking") return "speaking";
  if (phase === "processing") return "thinking";
  if (phase === "loading") return "loading";
  return "listening";
}

/** Why the microphone did not start; null when the permission alert already explains it. */
function recordStartError(error: unknown): UiError | null {
  if (!(error instanceof DOMException)) return toUiError(error, "RECORD_START_FAILED");
  if (error.name === "NotAllowedError") return null;
  if (error.name === "NotFoundError") return new ClientError("MIC_NOT_FOUND", { cause: error });
  return new ClientError("RECORD_START_FAILED", { cause: error });
}

/**
 * Everything the interview page does, behind one hook: it wires the SSE
 * stream, recorder, playback, webcam, avatar and coach to the phase machine,
 * runs the side effects for each user action, and returns view state plus
 * actions for the page to render.
 */
export function useInterviewController(sessionId: string) {
  const router = useRouter();
  const { t } = useI18n();
  const [machine, dispatch] = useReducer(phaseReducer, initialMachineState);
  const [meta, setMeta] = useState<SessionMeta | null>(null);

  const recorder = useAudioRecorder();
  const playback = useAudioPlayback();
  const webcam = useWebcam();
  const avatar = useAvatarStream(sessionId);
  const isMock = getMockMode();
  const videoMode = meta?.videoMode ?? false;
  const coachEnabled = meta?.coachEnabled ?? true;
  const coach = useCoach(sessionId, coachEnabled);

  // Each `avatar_stream_ready` carries a fresh single-use stream id; connect once per id.
  const connectedStreamIdRef = useRef<string | null>(null);
  const lastAnswerRef = useRef<Blob | null>(null);

  const handleEvent = (event: InterviewEvent) => {
    dispatch(event);
    if (
      event.type === "avatar_stream_ready" &&
      connectedStreamIdRef.current !== event.data.streamId
    ) {
      connectedStreamIdRef.current = event.data.streamId;
      void avatar.connect(event.data);
    } else if (event.type === "avatar_stream_failed") {
      avatar.onStreamFailed(event.data.code);
    }
  };
  const interview = useInterviewStream(sessionId, handleEvent);

  // POST /start: once per mount pair (Strict Mode safe), or forced on retry.
  const start = useCallback(
    async (force = false) => {
      if (!force && startedSessions.has(sessionId)) return;
      startedSessions.add(sessionId);
      dispatch({ type: "START_REQUESTED" });
      try {
        await apiRequest(`/api/interview/${sessionId}/start`, { method: "POST" });
        dispatch({ type: "START_OK" });
      } catch (error) {
        startedSessions.delete(sessionId); // allow a retry to POST again
        console.error("Interview start failed:", error);
        dispatch({ type: "START_FAILED", error: toUiError(error) });
      }
    },
    [sessionId],
  );

  useEffect(() => {
    void start();
    return () => {
      // Deferred so Strict Mode's synchronous remount still sees the guard.
      setTimeout(() => startedSessions.delete(sessionId), 0);
    };
  }, [sessionId, start]);

  // Session metadata for the header; video sessions turn the camera on.
  const { start: startWebcam } = webcam;
  useEffect(() => {
    let cancelled = false;
    apiFetch<SessionMeta>(`/api/sessions/${sessionId}`)
      .then((data) => {
        if (cancelled) return;
        const next: SessionMeta = {
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          difficulty: data.difficulty,
          videoMode: data.videoMode ?? false,
          coachEnabled: data.coachEnabled ?? true,
        };
        setMeta(next);
        if (next.videoMode) void startWebcam();
      })
      .catch(() => {
        // Non-critical: the header shows its fallback
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, startWebcam]);

  const avatarFailed = Boolean(avatar.error) || interview.avatarFailureCode !== null;
  useAvatarOffers({
    sessionId,
    enabled: videoMode && !isMock,
    connected: avatar.isConnected,
    streamId: interview.avatarStreamData?.streamId ?? null,
    failed: avatarFailed,
  });

  // Completion: show the done state briefly, then go to the report.
  const { disconnect: disconnectAvatar } = avatar;
  const redirectTo = machine.phase === "complete" ? interview.redirectTo : null;
  useEffect(() => {
    if (!redirectTo) return;
    disconnectAvatar();
    const timeout = setTimeout(() => router.push(redirectTo), COMPLETE_REDIRECT_MS);
    return () => clearTimeout(timeout);
  }, [redirectTo, disconnectAvatar, router]);

  // ---- actions ---------------------------------------------------------

  /** Play the question on demand, preceded by any stage narration queued for it. */
  const play = () => {
    const audioUrl = interview.audioUrl;
    if (!canPlay(machine) || !audioUrl) return;
    const narration = machine.questionNarration;
    dispatch({ type: "PLAY" });
    // Video mode: make the avatar lip-sync the same line as the audio starts.
    if (videoMode && avatar.isConnected) {
      void apiRequest(`/api/interview/${sessionId}/avatar-speak`, { method: "POST" }).catch(
        () => {},
      );
    }
    if (narration) void playback.enqueue(narration).catch(() => {});
    void playback
      .play(audioUrl, interview.currentQuestion?.text)
      .catch(() => {})
      .finally(() => dispatch({ type: "PLAYBACK_ENDED" }));
  };

  const startRecording = async () => {
    if (!canRecord(machine)) return;
    dispatch({ type: "RECORD" });
    try {
      await recorder.startRecording();
      dispatch({ type: "RECORD_STARTED" });
    } catch (error) {
      // Canceled by "stop interview" while the mic prompt was open.
      if (error instanceof DOMException && error.name === "AbortError") return;
      dispatch({ type: "RECORD_FAILED", error: recordStartError(error) });
    }
  };

  const submit = async (blob: Blob) => {
    lastAnswerRef.current = blob;
    dispatch({ type: "SUBMIT" });
    try {
      await interview.submitAnswer(blob);
    } catch (error) {
      console.error("Failed to submit answer:", error);
      dispatch({ type: "SUBMIT_FAILED", error: toUiError(error) });
    }
  };

  const stopRecording = async () => {
    if (machine.phase !== "recording") return;
    dispatch({ type: "STOP_RECORDING" });
    let blob: Blob;
    try {
      blob = await recorder.stopRecording();
    } catch (error) {
      dispatch({ type: "RECORD_FAILED", error: toUiError(error, "RECORD_FAILED") });
      return;
    }
    await submit(blob);
  };

  const retryUpload = () => {
    if (lastAnswerRef.current) void submit(lastAnswerRef.current);
  };

  /** "Retry" on a server error repeats whatever the candidate did last. */
  const retryLastAction = () => {
    interview.clearError();
    if (machine.lastAction === "submit" && lastAnswerRef.current) retryUpload();
    else void start(true);
  };

  // Pause is a client-side hold: the server does nothing between answers, so nothing is spent.
  const pause = () => {
    if (machine.paused || !canPause(machine)) return;
    playback.pause();
    dispatch({ type: "PAUSE" });
  };

  const resume = () => {
    dispatch({ type: "RESUME" });
    playback.resume();
  };

  const togglePause = () => (machine.paused ? resume() : pause());

  const openCoach = () => {
    if (!coachEnabled || (!machine.paused && !canPause(machine))) return;
    if (!machine.paused) playback.pause();
    dispatch({ type: "OPEN_COACH" });
  };

  const closeCoach = () => dispatch({ type: "CLOSE_COACH" });

  const questionId = interview.currentQuestion?.questionId;

  const explain = (selection: string, source: "question" | "transcript") => {
    if (!coachEnabled) return;
    openCoach();
    void coach.ask({ questionId, source, selection });
  };

  const askCoach = (prompt: string) => void coach.ask({ questionId, source: "free", prompt });

  const stopInterview = async () => {
    if (
      machine.stopping ||
      machine.phase === "complete" ||
      !window.confirm(t.interview.stop.confirm)
    )
      return;
    dispatch({ type: "STOP_INTERVIEW" });
    recorder.cancelRecording();
    playback.stop();
    webcam.stop();
    coach.cancel();
    try {
      await apiRequest(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        json: { status: "ABANDONED" },
      });
      avatar.disconnect();
      router.replace("/history");
    } catch (error) {
      dispatch({ type: "STOP_FAILED", error: toUiError(error) });
    }
  };

  useInterviewShortcuts({
    onStop: () => void stopInterview(),
    onTogglePause: () => {
      if (machine.stopping || (!machine.paused && !canPause(machine))) return false;
      togglePause();
      return true;
    },
    onToggleRecording: () => {
      if (machine.stopping || machine.paused) return false;
      if (machine.phase === "ready") void startRecording();
      else if (machine.phase === "recording") void stopRecording();
      else return false;
      return true;
    },
    onReplay: () => {
      if (machine.stopping || machine.paused) return false;
      play();
      return true;
    },
  });

  // ---- view state ------------------------------------------------------

  const pausable = canPause(machine);

  return {
    sessionId,
    meta,
    videoMode,
    coachEnabled,
    isMock,
    phase: machine.phase,
    paused: machine.paused,
    coachOpen: machine.coachOpen,
    /** Pause, the coach and "Explain this" are available. */
    canHold: machine.paused || pausable,
    starting: machine.starting,
    stopping: machine.stopping,
    errors: machine.errors,
    recordPhase: machine.paused ? "idle" : toRecordPhase(machine.phase),
    avatarPhase: toAvatarPhase(machine.phase, avatarFailed),
    micDenied: recorder.permissionState === "denied",
    interview,
    recorder: { audioLevel: recorder.audioLevel, duration: recorder.duration },
    playback: { isPlaying: playback.isPlaying },
    avatar: {
      remoteStream: avatar.remoteStream,
      isConnected: avatar.isConnected,
      hasFrames: avatar.hasFrames,
      presenterUrl: interview.avatarStreamData?.presenterUrl ?? null,
    },
    webcam: { stream: webcam.stream, isActive: webcam.isActive },
    coach: {
      notes: coach.notes,
      draft: coach.draft,
      isStreaming: coach.isStreaming,
      error: coach.error,
      modelLabel: isMock ? "mock" : (coach.model ?? t.common.loading),
    },
    actions: {
      play,
      stopPlayback: playback.stop,
      startRecording,
      stopRecording,
      retryUpload,
      retryLastAction,
      retryStart: () => void start(true),
      dismissSubmitError: () => dispatch({ type: "DISMISS", slot: "submit" }),
      togglePause,
      resume,
      openCoach,
      closeCoach,
      toggleCoach: () => (machine.coachOpen ? closeCoach() : openCoach()),
      explain,
      askCoach,
      cancelCoach: coach.cancel,
      stopInterview,
      toggleWebcam: () => (webcam.isActive ? webcam.stop() : void webcam.start()),
    },
  };
}

export type InterviewController = ReturnType<typeof useInterviewController>;
