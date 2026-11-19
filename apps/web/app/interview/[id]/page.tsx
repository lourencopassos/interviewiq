"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Check, GraduationCap, Layers, MicOff, Pause, Play, RefreshCw, Square } from "lucide-react";
import { useInterviewStream } from "@/hooks/useInterviewStream";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useWebcam } from "@/hooks/useWebcam";
import { useAvatarStream } from "@/hooks/useAvatarStream";
import { useCoach } from "@/hooks/useCoach";
import { clientHeaders } from "@/lib/client-id";
import { getMockMode } from "@/lib/mock-mode";
import { InterviewHeader } from "@/components/interview/interview-header";
import { QuestionCard } from "@/components/interview/question-card";
import { AudioWaveform } from "@/components/interview/audio-waveform";
import { RecordButton, type RecordPhase } from "@/components/interview/record-button";
import { TranscriptPreview } from "@/components/interview/transcript-preview";
import { ProgressBar } from "@/components/interview/progress-bar";
import { TransitionCard } from "@/components/interview/transition-card";
import { ConnectionStatus } from "@/components/interview/connection-status";
import {
  StageTransitionCard,
  localizeStage,
} from "@/components/interview/stage-transition-card";
import { VideoLayout } from "@/components/interview/video-layout";
import { CoachDrawer } from "@/components/interview/coach-drawer";
import { SelectionPopover } from "@/components/interview/selection-popover";
import { PauseOverlay } from "@/components/interview/pause-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { interpolate, useI18n } from "@/lib/i18n";

type InterviewPhase =
  | "loading"
  | "speaking"
  | "ready_to_record"
  | "starting_recording"
  | "recording"
  | "processing"
  | "transition"
  | "stage_transition"
  | "complete";

type LastAction = "start" | "submit" | null;

/**
 * Session ids for which `/start` has already been POSTed by a mounted page.
 * Module-level so it survives React Strict Mode's unmount/remount cycle; the
 * cleanup removes the id asynchronously so a *real* remount (navigating back
 * to the interview) re-POSTs start and gets the current question re-emitted.
 */
const startedSessions = new Set<string>();

function errorMessage(
  err: unknown,
  copy: { network: string; fallback: string },
): string {
  if (err instanceof TypeError) return copy.network;
  if (err instanceof Error && err.message) return err.message;
  return copy.fallback;
}

function toRecordPhase(phase: InterviewPhase): RecordPhase {
  switch (phase) {
    case "speaking":
      return "speaking";
    case "ready_to_record":
      return "ready";
    case "recording":
      return "recording";
    case "processing":
      return "processing";
    default:
      return "idle";
  }
}

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  // Latest dictionary for the async handlers, so their dependency lists (and
  // the start effect that keys off `startInterview`) are unaffected by locale.
  const tRef = useRef(t);
  tRef.current = t;

  const [phase, setPhase] = useState<InterviewPhase>("loading");
  const [sessionMeta, setSessionMeta] = useState<{
    companyName: string;
    jobTitle: string;
    difficulty: string;
    videoMode: boolean;
    coachEnabled: boolean;
  } | null>(null);
  const [paused, setPaused] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);

  const lastActionRef = useRef<LastAction>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);

  const interview = useInterviewStream(id);
  const recorder = useAudioRecorder();
  const playback = useAudioPlayback();
  const webcam = useWebcam();
  const avatarStream = useAvatarStream(id);

  const isVideoMode = sessionMeta?.videoMode ?? false;
  const coachEnabled = sessionMeta?.coachEnabled ?? true;
  const isMock = getMockMode();
  const coach = useCoach(id, coachEnabled);

  // POST /start — once per mount pair (Strict Mode safe), or forced on retry
  const startInterview = useCallback(
    async (force = false) => {
      if (!force && startedSessions.has(id)) return;
      startedSessions.add(id);
      lastActionRef.current = "start";
      setIsStarting(true);
      setStartError(null);
      try {
        const res = await fetch(`/api/interview/${id}/start`, { method: "POST", headers: clientHeaders() });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const copy = tRef.current.interview;
          const known =
            typeof data?.code === "string"
              ? (copy.serverErrors as Record<string, string>)[data.code]
              : undefined;
          throw new Error(
            res.status === 403 || res.status === 404
              ? copy.errors.notFound
              : known ??
                  (typeof data?.error === "string"
                    ? data.error
                    : interpolate(copy.errors.startFailedStatus, { status: res.status })),
          );
        }
      } catch (err) {
        // Allow a retry to POST again
        startedSessions.delete(id);
        console.error("Interview start failed:", err);
        setStartError(
          errorMessage(err, {
            network: tRef.current.interview.errors.network,
            fallback: tRef.current.interview.errors.startFailed,
          }),
        );
      } finally {
        setIsStarting(false);
      }
    },
    [id],
  );

  useEffect(() => {
    startInterview();
    return () => {
      // Deferred so Strict Mode's synchronous remount still sees the guard.
      setTimeout(() => startedSessions.delete(id), 0);
    };
  }, [id, startInterview]);

  // Fetch session metadata separately
  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(`/api/sessions/${id}`, { headers: clientHeaders() });
        if (res.ok) {
          const data = await res.json();
          setSessionMeta({
            companyName: data.companyName,
            jobTitle: data.jobTitle,
            difficulty: data.difficulty,
            videoMode: data.videoMode ?? false,
            coachEnabled: data.coachEnabled ?? true,
          });
        }
      } catch {
        // Non-critical — header will show fallback
      }
    }
    fetchMeta();
  }, [id]);

  // Start webcam when video mode is detected
  useEffect(() => {
    if (isVideoMode && !webcam.isActive && !webcam.error) {
      webcam.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoMode]);

  // Ask the server for a D-ID offer when video mode has no live peer: on first
  // load, after a reload, and (a couple of times) after a failure. Guarded by a
  // timestamp so Strict Mode's double mount and quick re-renders ask only once.
  const offerAttemptsRef = useRef(0);
  const lastOfferAtRef = useRef(0);
  useEffect(() => {
    if (!isVideoMode || isMock) return;
    if (avatarStream.isConnected) {
      offerAttemptsRef.current = 0;
      return;
    }
    const failed = Boolean(avatarStream.error) || interview.avatarFailed;
    if (interview.avatarStreamData && !failed) return; // offer in hand, negotiating
    if (offerAttemptsRef.current >= 4) return;
    if (Date.now() - lastOfferAtRef.current < 4000) return;
    // Back off after failures (e.g. D-ID's concurrent-stream quota needs idle streams to expire)
    const delay = failed ? [5000, 15000, 45000, 90000][offerAttemptsRef.current] ?? 90000 : 0;
    let fired = false;
    const timer = setTimeout(() => {
      fired = true;
      lastOfferAtRef.current = Date.now();
      offerAttemptsRef.current += 1;
      void fetch(`/api/interview/${id}/avatar-offer`, { method: "POST", headers: clientHeaders() }).catch(() => {});
    }, delay);
    return () => {
      if (!fired) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideoMode, isMock, avatarStream.isConnected, avatarStream.error, interview.avatarFailed, interview.avatarStreamData, phase]);

  // Connect (or reconnect) the avatar whenever the server hands us a new offer.
  // Each `avatar_stream_ready` carries a fresh single-use stream id.
  const connectedStreamIdRef = useRef<string | null>(null);
  useEffect(() => {
    const data = interview.avatarStreamData;
    if (!data || connectedStreamIdRef.current === data.streamId) return;
    connectedStreamIdRef.current = data.streamId;
    avatarStream.connect(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.avatarStreamData]);

  // Handle avatar stream failure
  useEffect(() => {
    if (interview.avatarFailed) {
      const serverErrors = tRef.current.interview.serverErrors as Record<string, string>;
      avatarStream.onStreamFailed(
        (interview.avatarFailureCode && serverErrors[interview.avatarFailureCode]) ??
          serverErrors.AVATAR_UNAVAILABLE,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.avatarFailed]);

  const questionId = interview.currentQuestion?.questionId;
  const pendingNarration = useRef<string | null>(null);
  const questionNarration = useRef<string | null>(null);

  // Handle transition text
  useEffect(() => {
    if (interview.transitionMessage && phase === "processing") {
      setPhase("transition");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.transitionMessage]);

  // Include the stage narration when the candidate chooses to play its first question.
  useEffect(() => {
    if (interview.stageTransition && interview.stageTransition.completedStage) {
      setPhase("stage_transition");
      pendingNarration.current = interview.stageTransition.transitionAudioUrl || null;
    }
  }, [interview.stageTransition]);

  // A written question is immediately answerable, even while TTS is pending.
  useEffect(() => {
    if (!questionId) return;
    questionNarration.current = pendingNarration.current;
    pendingNarration.current = null;
    setPhase("ready_to_record");
  }, [questionId]);

  const playQuestion = () => {
    if (paused || phase !== "ready_to_record" || !interview.audioUrl) return;
    setPhase("speaking");
    // Video mode: make the avatar lip-sync the same line as the audio starts.
    if (isVideoMode && avatarStream.isConnected) {
      void fetch(`/api/interview/${id}/avatar-speak`, { method: "POST", headers: clientHeaders() }).catch(() => {});
    }
    if (questionNarration.current) {
      void playback.enqueue(questionNarration.current).catch(() => {});
      questionNarration.current = null;
    }
    void playback.play(interview.audioUrl, interview.currentQuestion?.text)
      .catch(() => {})
      .finally(() => setPhase((current) => current === "speaking" ? "ready_to_record" : current));
  };

  // Server-side errors: audio failures still let the user answer the written
  // question; a failure during processing lets them record again.
  useEffect(() => {
    if (!interview.error) return;
    if (interview.error.code === "AUDIO_UNAVAILABLE") {
      return;
    }
    if (phase === "processing") {
      setPhase("ready_to_record");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.error]);

  // Handle interview completion
  useEffect(() => {
    if (interview.isComplete && interview.redirectTo) {
      setPhase("complete");
      avatarStream.disconnect();
      // Small delay before redirect to show completion state
      const timeout = setTimeout(() => {
        router.push(interview.redirectTo!);
      }, 2000);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.isComplete, interview.redirectTo, router]);

  const handleStartRecording = useCallback(async () => {
    if (paused || phase !== "ready_to_record" || !questionId) return;
    setRecordError(null);
    setSubmitError(null);
    try {
      setPhase("starting_recording");
      await recorder.startRecording();
      setPhase("recording");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPhase("ready_to_record");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        // permissionState becomes "denied"; the mic alert covers it
        return;
      }
      const message =
        err instanceof DOMException && err.name === "NotFoundError"
          ? tRef.current.interview.errors.noMicrophone
          : errorMessage(err, {
              network: tRef.current.interview.errors.network,
              fallback: tRef.current.interview.errors.recordStartFailed,
            });
      setRecordError(message);
    }
  }, [recorder, paused, phase, questionId]);

  const submitBlob = useCallback(
    async (blob: Blob) => {
      lastActionRef.current = "submit";
      setLastBlob(blob);
      setSubmitError(null);
      setPhase("processing");
      try {
        await interview.submitAnswer(blob);
      } catch (err) {
        console.error("Failed to submit answer:", err);
        // useInterviewStream throws fixed English messages for its own failures;
        // translate those here and pass server-provided messages through.
        const hookMessage = err instanceof Error ? err.message : "";
        const message = hookMessage.startsWith("Network error")
          ? tRef.current.interview.errors.uploadNetwork
          : hookMessage.startsWith("Failed to submit answer")
            ? tRef.current.interview.errors.submitFailed
            : errorMessage(err, {
                network: tRef.current.interview.errors.network,
                fallback: tRef.current.interview.errors.submitFailed,
              });
        setSubmitError(message);
        setPhase("ready_to_record");
      }
    },
    [interview],
  );

  const handleStopRecording = useCallback(async () => {
    setPhase("processing");
    let blob: Blob;
    try {
      blob = await recorder.stopRecording();
    } catch (err) {
      // useAudioRecorder rejects with "No active recording" / "Recording failed";
      // both read as a failed recording to the user.
      const hookMessage = err instanceof Error ? err.message : "";
      const message =
        hookMessage === "No active recording" || hookMessage === "Recording failed"
          ? tRef.current.interview.errors.recordFailed
          : errorMessage(err, {
              network: tRef.current.interview.errors.network,
              fallback: tRef.current.interview.errors.recordFailed,
            });
      setRecordError(message);
      setPhase("ready_to_record");
      return;
    }
    await submitBlob(blob);
  }, [recorder, submitBlob]);

  const handleRetryUpload = useCallback(async () => {
    if (!lastBlob) return;
    setIsResubmitting(true);
    try {
      await submitBlob(lastBlob);
    } finally {
      setIsResubmitting(false);
    }
  }, [lastBlob, submitBlob]);

  const handleRetryLastAction = useCallback(() => {
    interview.clearError();
    if (lastActionRef.current === "submit" && lastBlob) {
      handleRetryUpload();
    } else {
      startInterview(true);
    }
  }, [interview, lastBlob, handleRetryUpload, startInterview]);

  const handleWebcamToggle = useCallback(() => {
    if (webcam.isActive) {
      webcam.stop();
    } else {
      webcam.start();
    }
  }, [webcam]);

  // Pause is a client-side hold: the server does nothing between answers, so
  // nothing is spent. Allowed whenever the candidate is not mid-recording or
  // waiting on the pipeline.
  const canPause =
    phase === "ready_to_record" ||
    phase === "speaking" ||
    phase === "transition" ||
    phase === "stage_transition";

  const pause = useCallback(() => {
    if (!canPause) return;
    playback.pause();
    setPaused(true);
  }, [canPause, playback]);

  const resume = useCallback(() => {
    setCoachOpen(false);
    setPaused(false);
    playback.resume();
  }, [playback]);

  const togglePause = useCallback(() => {
    if (paused) resume();
    else pause();
  }, [paused, pause, resume]);

  const openCoach = useCallback(() => {
    if (!coachEnabled || (!paused && !canPause)) return;
    if (!paused) pause();
    setCoachOpen(true);
  }, [coachEnabled, paused, canPause, pause]);

  const handleExplain = useCallback(
    (selection: string, source: "question" | "transcript") => {
      if (!coachEnabled) return;
      openCoach();
      void coach.ask({
        questionId: interview.currentQuestion?.questionId,
        source,
        selection,
      });
    },
    [coachEnabled, openCoach, coach, interview.currentQuestion?.questionId],
  );

  const handleAskCoach = useCallback(
    (prompt: string) => {
      void coach.ask({
        questionId: interview.currentQuestion?.questionId,
        source: "free",
        prompt,
      });
    },
    [coach, interview.currentQuestion?.questionId],
  );

  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const stoppingRef = useRef(false);
  const stopInterview = async () => {
    if (stoppingRef.current || phase === "complete" || !window.confirm(t.interview.stop.confirm)) return;
    stoppingRef.current = true;
    setStopping(true);
    setStopError(null);
    recorder.cancelRecording();
    playback.stop();
    webcam.stop();
    coach.cancel();
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: clientHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "ABANDONED" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || t.interview.stop.failed);
      }
      avatarStream.disconnect();
      router.replace("/history");
    } catch (error) {
      stoppingRef.current = false;
      setStopping(false);
      setStopError(error instanceof Error ? error.message : t.interview.stop.failed);
      setPhase((current) => ["starting_recording", "recording", "speaking"].includes(current) ? "ready_to_record" : current);
    }
  };

  // Keyboard shortcuts: Space toggles recording, R replays the question,
  // P pauses / resumes, Escape stops the interview.
  // Ignored while typing in a field and while an answer is being processed.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        event.preventDefault();
        void stopInterview();
        return;
      }
      if (stoppingRef.current) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "p" || event.key === "P") {
        if (paused || canPause) {
          event.preventDefault();
          togglePause();
        }
        return;
      }

      if (paused) return;

      if (event.code === "Space") {
        if (target?.closest("button, a, [role=button]")) return;
        if (phase === "ready_to_record") {
          event.preventDefault();
          void handleStartRecording();
        } else if (phase === "recording") {
          event.preventDefault();
          void handleStopRecording();
        }
        return;
      }

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        playQuestion();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopInterview, phase, paused, canPause, coachOpen, togglePause, interview.audioUrl, interview.currentQuestion?.text, handleStartRecording, handleStopRecording]);

  // Derive avatar phase from interview phase
  const avatarPhase = (() => {
    if (avatarStream.error || interview.avatarFailed) return "fallback" as const;
    if (phase === "speaking") return "speaking" as const;
    if (phase === "recording") return "listening" as const;
    if (phase === "processing") return "thinking" as const;
    if (phase === "loading") return "loading" as const;
    return "listening" as const;
  })();

  const micDenied = recorder.permissionState === "denied";

  // `isFollowUp` rides along on the `question_ready` payload (see
  // packages/types/src/events.ts); the stream hook stores the payload as-is.
  const currentQuestion = interview.currentQuestion;
  const isFollowUp =
    currentQuestion !== null &&
    "isFollowUp" in currentQuestion &&
    currentQuestion.isFollowUp === true;

  // Server `error` events with a known code get interface-language copy;
  // anything else shows the server's message as-is.
  const serverErrorMessage = interview.error
    ? ((t.interview.serverErrors as Record<string, string>)[interview.error.code] ??
      interview.error.message)
    : null;

  // Coach failures with a known code get interface-language copy too.
  const coachError = coach.error
    ? {
        ...coach.error,
        message:
          (t.interview.serverErrors as Record<string, string>)[coach.error.code] ?? coach.error.message,
      }
    : null;

  // Inline error alerts (rendered in both the loading view and the main layout)
  const errorAlerts = (
    <>
      {interview.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.interview.alerts.server.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{serverErrorMessage}</p>
            <div className="flex flex-wrap gap-2">
              {interview.error.retryable ? (
                <Button size="sm" variant="outline" onClick={handleRetryLastAction} className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  {t.common.retry}
                </Button>
              ) : (
                <Link href="/new">
                  <Button size="sm" variant="outline">
                    {t.interview.alerts.server.newInterview}
                  </Button>
                </Link>
              )}
              <Button size="sm" variant="ghost" onClick={interview.clearError}>
                {t.common.dismiss}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {stopError && <p className="tile bg-blush p-3 text-sm" role="alert">{stopError}</p>}
      {startError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.interview.alerts.start.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="whitespace-pre-wrap break-words">{startError}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => startInterview(true)}
                disabled={isStarting}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {isStarting ? t.interview.alerts.start.retrying : t.common.retry}
              </Button>
              <Link href="/new">
                <Button size="sm" variant="ghost">
                  {t.interview.alerts.start.back}
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.interview.alerts.submit.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{submitError}</p>
            <div className="flex flex-wrap gap-2">
              {lastBlob && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryUpload}
                  disabled={isResubmitting}
                  className="gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  {isResubmitting
                    ? t.interview.alerts.submit.retrying
                    : t.interview.alerts.submit.retryUpload}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSubmitError(null)}>
                {t.interview.alerts.submit.recordAgain}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {micDenied && (
        <Alert variant="warning">
          <MicOff className="h-4 w-4" />
          <AlertTitle>{t.interview.alerts.mic.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{t.interview.alerts.mic.body}</p>
            <Button size="sm" variant="outline" onClick={handleStartRecording} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              {t.common.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {recordError && !micDenied && (
        <Alert variant="destructive">
          <MicOff className="h-4 w-4" />
          <AlertTitle>{t.interview.alerts.recording.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{recordError}</p>
            <Button size="sm" variant="outline" onClick={handleStartRecording} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              {t.common.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );

  const stopButton = (
    <Button size="sm" variant="destructive" onClick={stopInterview} aria-keyshortcuts="Escape">
      <Square className="h-3.5 w-3.5" /> {t.interview.stop.button}
      <span className="kbd hidden sm:inline">Esc</span>
    </Button>
  );

  if (stopping) return <p className="container py-8" role="status">{t.interview.stop.stopping}</p>;

  // Loading state
  if (phase === "loading" && !interview.currentQuestion) {
    return (
      <div className="container max-w-3xl py-8 sm:py-12">
        <div className="space-y-5">
          {errorAlerts}
          {stopButton}
          {/* Header strip placeholder */}
          <div className="tile flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-14" />
          </div>
          {/* Question placeholder */}
          <div className="tile p-5 sm:p-6">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-20 w-20 rounded-full" />
          </div>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-[12px] font-semibold text-muted-foreground">
          {!startError && (
            <span className="led led-live bg-sage-deep text-sage-deep/40" aria-hidden />
          )}
          {startError
            ? t.interview.loading.notStarted
            : isStarting
              ? t.interview.loading.generating
              : t.interview.loading.connecting}
        </p>
        <div className="mt-4 flex justify-center">
          <ConnectionStatus
            status={interview.connectionStatus}
            onReconnect={interview.reconnect}
          />
        </div>
      </div>
    );
  }

  // Complete state
  if (phase === "complete") {
    return (
      <div className="container max-w-3xl py-12 sm:py-20">
        <div className="tile flex flex-col items-center gap-4 bg-sage px-6 py-12 text-center text-sage-deep animate-pop-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-1.5 border-ink bg-card text-sage-deep shadow-pop">
            <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
          </div>
          <p className="eyebrow text-sage-deep">{t.interview.complete.eyebrow}</p>
          <h2 className="text-2xl text-sage-deep sm:text-3xl">
            {t.interview.complete.title}
          </h2>
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="led led-live bg-sage-deep text-sage-deep/40" aria-hidden />
            {t.interview.complete.building}
          </p>
        </div>
      </div>
    );
  }

  // Header: company · role | step rail | timer · connection. Full-width above the
  // split in video mode, first item of the column in audio mode.
  const headerBar = (
    <InterviewHeader
      companyName={sessionMeta?.companyName || t.interview.header.fallbackCompany}
      jobTitle={sessionMeta?.jobTitle || ""}
      difficulty={sessionMeta?.difficulty || "MID"}
      questionOrder={interview.currentQuestion?.order || 0}
      questionTotal={interview.currentQuestion?.total || 0}
      isRecording={phase === "recording"}
      paused={paused}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {stopButton}
          {coachEnabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => (coachOpen ? setCoachOpen(false) : openCoach())}
              disabled={!paused && !canPause}
              aria-pressed={coachOpen}
              className={coachOpen ? "bg-lavender text-lavender-deep" : undefined}
              title={t.interview.coach.open}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{t.interview.coach.open}</span>
            </Button>
          )}
          <Button
            size="sm"
            variant={paused ? "accent" : "outline"}
            onClick={togglePause}
            disabled={!paused && !canPause}
            aria-pressed={paused}
            title={paused ? t.interview.pause.resume : t.interview.pause.button}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">
              {paused ? t.interview.pause.resume : t.interview.pause.button}
            </span>
          </Button>
        </div>
      }
      progress={
        <ProgressBar
          current={interview.currentQuestion?.order || 0}
          total={interview.currentQuestion?.total || 0}
          isFollowUp={isFollowUp}
        />
      }
      status={
        <ConnectionStatus
          status={interview.connectionStatus}
          onReconnect={interview.reconnect}
        />
      }
    />
  );

  // Shared interview controls (used in both layouts)
  const interviewControls = (
    <>
      {!isVideoMode && headerBar}

      {/* Errors */}
      {errorAlerts}

      {/* Pause hold (inline so the question stays readable) */}
      <PauseOverlay
        open={paused}
        coachEnabled={coachEnabled}
        coachOpen={coachOpen}
        onResume={resume}
        onAskCoach={openCoach}
      />

      {/* Stage transition (Full Loop mode) */}
      {interview.stageTransition && phase === "stage_transition" && (
        <StageTransitionCard
          completedStage={interview.stageTransition.completedStage}
          stageScore={interview.stageTransition.stageScore}
          nextStage={interview.stageTransition.nextStage}
        />
      )}

      {/* Current stage indicator (Full Loop mode) */}
      {interview.currentStage && phase !== "stage_transition" && (
        <div className="flex justify-center">
          <span className="pill bg-lavender text-lavender-deep">
            <Layers className="h-3 w-3" aria-hidden />
            {localizeStage(interview.currentStage, t)}
          </span>
        </div>
      )}

      {/* Current question — keyed by id so each question pops in fresh */}
      {interview.currentQuestion && (
        <div data-coach-source="question">
          <QuestionCard
            key={interview.currentQuestion.questionId}
            text={interview.currentQuestion.text}
            category={interview.currentQuestion.category}
            order={interview.currentQuestion.order}
            total={interview.currentQuestion.total}
            isFollowUp={isFollowUp}
          />
        </div>
      )}

      {interview.currentQuestion && interview.audioUrl && (phase === "ready_to_record" || phase === "speaking") && (
        <Button variant="outline" size="sm" disabled={paused} onClick={phase === "speaking" ? playback.stop : playQuestion}>
          {phase === "speaking" ? t.interview.record.stopAudio : t.interview.record.play}
        </Button>
      )}

      {/* Audio waveform (hidden in video mode — avatar replaces it) */}
      {!isVideoMode && (
        <AudioWaveform
          isActive={phase === "speaking" || phase === "recording"}
          audioLevel={
            phase === "recording"
              ? recorder.audioLevel
              : phase === "speaking"
                ? 0.4
                : 0
          }
          variant={phase === "recording" ? "recording" : "speaking"}
        />
      )}

      {/* Record button — sticks to the bottom edge on small screens */}
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-col items-center gap-3 bg-paper/85 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <RecordButton
          phase={paused ? "idle" : toRecordPhase(phase)}
          audioLevel={recorder.audioLevel}
          duration={recorder.duration}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
        />
        <p className="hidden items-center justify-center gap-2 pb-2 text-[10px] text-muted-foreground sm:flex print:hidden">
          <span className="kbd">Space</span> {t.interview.shortcuts.record}
          <span className="kbd ml-2">R</span> {t.interview.shortcuts.replay}
          <span className="kbd ml-2">P</span> {t.interview.shortcuts.pause}
        </p>
      </div>

      {/* Transcript preview + score tile */}
      <div data-coach-source="transcript">
        <TranscriptPreview
          transcript={interview.transcript}
          isProcessing={phase === "processing"}
          score={interview.evaluation?.score}
          tier={interview.evaluation?.tier}
        />
      </div>

      {/* The interviewer's remark before the next question */}
      {interview.transitionMessage && phase === "transition" && (
        <TransitionCard message={interview.transitionMessage} />
      )}

      {coachEnabled && (
        <SelectionPopover enabled={canPause || paused} onExplain={handleExplain} />
      )}
    </>
  );

  return (
    <div className={coachEnabled && coachOpen
      ? "mx-auto grid max-w-[100rem] items-start gap-5 px-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(18rem,30%)]"
      : "mx-auto py-6 sm:py-8"}>
      <div className="min-w-0">
        {isVideoMode ? (
          <VideoLayout
            remoteStream={avatarStream.remoteStream}
            isStreamConnected={avatarStream.isConnected}
            hasFrames={avatarStream.hasFrames}
            presenterUrl={interview.avatarStreamData?.presenterUrl ?? null}
            isPlaying={playback.isPlaying}
            avatarPhase={avatarPhase}
            isMockMode={isMock}
            webcamStream={webcam.stream}
            webcamActive={webcam.isActive}
            onWebcamToggle={handleWebcamToggle}
            header={headerBar}
          >
            {interviewControls}
          </VideoLayout>
        ) : (
          <div className="container max-w-3xl space-y-5">{interviewControls}</div>
        )}
      </div>
      {coachEnabled && (
        <CoachDrawer
          open={coachOpen}
          onClose={() => setCoachOpen(false)}
          notes={coach.notes}
          currentQuestionId={interview.currentQuestion?.questionId ?? null}
          draft={coach.draft}
          isStreaming={coach.isStreaming}
          error={coachError}
          onAsk={handleAskCoach}
          onCancel={coach.cancel}
          modelLabel={isMock ? "mock" : (coach.model ?? "…")}
        />
      )}
    </div>
  );
}
