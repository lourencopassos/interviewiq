"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, MicOff, RefreshCw } from "lucide-react";
import { useInterviewStream } from "@/hooks/useInterviewStream";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useWebcam } from "@/hooks/useWebcam";
import { useAvatarStream } from "@/hooks/useAvatarStream";
import { getMockMode } from "@/lib/mock-mode";
import { InterviewHeader } from "@/components/interview/interview-header";
import { QuestionCard } from "@/components/interview/question-card";
import { AudioWaveform } from "@/components/interview/audio-waveform";
import { RecordButton, type RecordPhase } from "@/components/interview/record-button";
import { TranscriptPreview } from "@/components/interview/transcript-preview";
import { ProgressBar } from "@/components/interview/progress-bar";
import { TransitionCard } from "@/components/interview/transition-card";
import { ConnectionStatus } from "@/components/interview/connection-status";
import { StageTransitionCard } from "@/components/interview/stage-transition-card";
import { VideoLayout } from "@/components/interview/video-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type InterviewPhase =
  | "loading"
  | "speaking"
  | "ready_to_record"
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

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof TypeError) return "Network error — please check your connection";
  if (err instanceof Error && err.message) return err.message;
  return fallback;
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

  const [phase, setPhase] = useState<InterviewPhase>("loading");
  const [sessionMeta, setSessionMeta] = useState<{
    companyName: string;
    jobTitle: string;
    difficulty: string;
    videoMode: boolean;
  } | null>(null);
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
  const isMock = getMockMode();

  // POST /start — once per mount pair (Strict Mode safe), or forced on retry
  const startInterview = useCallback(
    async (force = false) => {
      if (!force && startedSessions.has(id)) return;
      startedSessions.add(id);
      lastActionRef.current = "start";
      setIsStarting(true);
      setStartError(null);
      try {
        const res = await fetch(`/api/interview/${id}/start`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : `Failed to start interview (${res.status})`,
          );
        }
      } catch (err) {
        // Allow a retry to POST again
        startedSessions.delete(id);
        console.error("Interview start failed:", err);
        setStartError(errorMessage(err, "Failed to start interview"));
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
        const res = await fetch(`/api/sessions/${id}`);
        if (res.ok) {
          const data = await res.json();
          setSessionMeta({
            companyName: data.companyName,
            jobTitle: data.jobTitle,
            difficulty: data.difficulty,
            videoMode: data.videoMode ?? false,
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

  // Connect avatar stream when data arrives via SSE
  useEffect(() => {
    if (interview.avatarStreamData && !avatarStream.isConnected && !avatarStream.error) {
      avatarStream.connect(interview.avatarStreamData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.avatarStreamData]);

  // Handle avatar stream audio injection event
  useEffect(() => {
    if (interview.avatarSpeaking) {
      avatarStream.onAudioInjected();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.avatarSpeaking]);

  // Handle avatar stream failure
  useEffect(() => {
    if (interview.avatarFailed) {
      avatarStream.onStreamFailed("Avatar stream failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.avatarFailed]);

  // Queue question audio when ready. It plays after anything already queued
  // (e.g. a stage-transition narration), and the phase flips to "speaking"
  // only when this clip actually starts.
  useEffect(() => {
    if (!interview.audioUrl || phase === "recording") return;
    const questionText = interview.currentQuestion?.text;
    playback
      .enqueue(interview.audioUrl, {
        mockText: questionText,
        onStart: () => setPhase("speaking"),
      })
      .then(() => setPhase("ready_to_record"))
      .catch(() => {
        // Audio play failed (possibly autoplay blocked) — go straight to recording
        setPhase("ready_to_record");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.audioUrl]);

  // Sync avatar speaking state with audio playback ending
  useEffect(() => {
    if (!playback.isPlaying && avatarStream.isSpeaking) {
      avatarStream.onAudioEnded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.isPlaying]);

  // Handle transition text
  useEffect(() => {
    if (interview.transitionMessage && phase === "processing") {
      setPhase("transition");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.transitionMessage]);

  // Handle stage transition (Full Loop mode): narration first, then the next
  // question's audio (queued by the effect above when `audio_ready` arrives).
  useEffect(() => {
    if (interview.stageTransition && interview.stageTransition.completedStage) {
      setPhase("stage_transition");
      if (interview.stageTransition.transitionAudioUrl) {
        playback.enqueue(interview.stageTransition.transitionAudioUrl).catch(() => {
          // Narration failed — the question audio still plays next
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.stageTransition]);

  // Server-side errors: audio failures still let the user answer the written
  // question; a failure during processing lets them record again.
  useEffect(() => {
    if (!interview.error) return;
    if (interview.error.code === "AUDIO_UNAVAILABLE") {
      if (phase !== "recording") setPhase("ready_to_record");
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
    setRecordError(null);
    setSubmitError(null);
    try {
      await recorder.startRecording();
      setPhase("recording");
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        // permissionState becomes "denied"; the mic alert covers it
        return;
      }
      const message =
        err instanceof DOMException && err.name === "NotFoundError"
          ? "No microphone was found. Connect one and try again."
          : errorMessage(err, "Could not start recording");
      setRecordError(message);
    }
  }, [recorder]);

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
        setSubmitError(errorMessage(err, "Failed to submit your answer"));
        setPhase("ready_to_record");
      }
    },
    [interview],
  );

  const handleStopRecording = useCallback(async () => {
    let blob: Blob;
    try {
      blob = await recorder.stopRecording();
    } catch (err) {
      setRecordError(errorMessage(err, "Recording failed — please try again"));
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

  // Inline error alerts (rendered in both the loading view and the main layout)
  const errorAlerts = (
    <>
      {interview.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{interview.error.message}</p>
            <div className="flex flex-wrap gap-2">
              {interview.error.retryable ? (
                <Button size="sm" variant="outline" onClick={handleRetryLastAction} className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              ) : (
                <Link href="/new">
                  <Button size="sm" variant="outline">
                    Start a new interview
                  </Button>
                </Link>
              )}
              <Button size="sm" variant="ghost" onClick={interview.clearError}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {startError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not start the interview</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{startError}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => startInterview(true)}
                disabled={isStarting}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {isStarting ? "Retrying..." : "Retry"}
              </Button>
              <Link href="/new">
                <Button size="sm" variant="ghost">
                  Back to setup
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Your answer was not submitted</AlertTitle>
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
                  {isResubmitting ? "Retrying..." : "Retry upload"}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSubmitError(null)}>
                Record again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {micDenied && (
        <Alert variant="destructive">
          <MicOff className="h-4 w-4" />
          <AlertTitle>Microphone access is blocked</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Allow microphone access for this site in your browser settings,
              then try again.
            </p>
            <Button size="sm" variant="outline" onClick={handleStartRecording} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {recordError && !micDenied && (
        <Alert variant="destructive">
          <MicOff className="h-4 w-4" />
          <AlertTitle>Recording problem</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{recordError}</p>
            <Button size="sm" variant="outline" onClick={handleStartRecording} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );

  // Loading state
  if (phase === "loading" && !interview.currentQuestion) {
    return (
      <div className="container max-w-3xl py-12">
        <div className="space-y-6">
          {errorAlerts}
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="h-px bg-border/50" />
          <Skeleton className="h-32 w-full" />
          <div className="flex justify-center">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          {startError
            ? "Interview not started."
            : isStarting
              ? "Generating your interview questions..."
              : "Connecting to interview session..."}
        </p>
        <div className="flex justify-center mt-4">
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
      <div className="container max-w-3xl py-12">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Interview Complete
          </h2>
          <p className="text-muted-foreground">
            Generating your coaching report...
          </p>
          <Skeleton className="h-2 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  // Shared interview controls (used in both layouts)
  const interviewControls = (
    <>
      {/* Header */}
      <InterviewHeader
        companyName={sessionMeta?.companyName || "Interview"}
        jobTitle={sessionMeta?.jobTitle || ""}
        difficulty={sessionMeta?.difficulty || "MID"}
        questionOrder={interview.currentQuestion?.order || 0}
        questionTotal={interview.currentQuestion?.total || 0}
      />

      {/* Progress */}
      <ProgressBar
        current={interview.currentQuestion?.order || 0}
        total={interview.currentQuestion?.total || 0}
      />

      {/* Errors */}
      {errorAlerts}

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
        <div className="text-center">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {interview.currentStage}
          </span>
        </div>
      )}

      {/* Transition feedback from previous answer */}
      {interview.transitionMessage && phase === "transition" && (
        <TransitionCard
          message={interview.transitionMessage}
          score={interview.evaluation?.score}
          tier={interview.evaluation?.tier}
        />
      )}

      {/* Current question */}
      {interview.currentQuestion && (
        <QuestionCard
          text={interview.currentQuestion.text}
          category={interview.currentQuestion.category}
          order={interview.currentQuestion.order}
          total={interview.currentQuestion.total}
        />
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

      {/* Record button */}
      <div className="flex justify-center">
        <RecordButton
          phase={toRecordPhase(phase)}
          audioLevel={recorder.audioLevel}
          duration={recorder.duration}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
        />
      </div>

      {/* Transcript preview */}
      <TranscriptPreview
        transcript={interview.transcript}
        isProcessing={phase === "processing"}
      />

      {/* Connection status */}
      <div className="flex justify-center">
        <ConnectionStatus
          status={interview.connectionStatus}
          onReconnect={interview.reconnect}
        />
      </div>
    </>
  );

  // Video mode layout
  if (isVideoMode) {
    return (
      <VideoLayout
        remoteStream={avatarStream.remoteStream}
        isStreamConnected={avatarStream.isConnected}
        isPlaying={playback.isPlaying}
        avatarPhase={avatarPhase}
        isMockMode={isMock}
        webcamStream={webcam.stream}
        webcamActive={webcam.isActive}
        onWebcamToggle={handleWebcamToggle}
      >
        {interviewControls}
      </VideoLayout>
    );
  }

  // Audio-only layout (unchanged)
  return (
    <div className="container max-w-3xl py-8">
      <div className="space-y-6">
        {interviewControls}
      </div>
    </div>
  );
}
