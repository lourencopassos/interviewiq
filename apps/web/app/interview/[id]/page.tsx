"use client";

import { useParams } from "next/navigation";
import { useInterviewController } from "@/hooks/useInterviewController";
import { InterviewHeader } from "@/components/interview/interview-header";
import { InterviewAlerts } from "@/components/interview/interview-alerts";
import { InterviewLoading } from "@/components/interview/interview-loading";
import { InterviewComplete } from "@/components/interview/interview-complete";
import { InterviewToolbar, StopInterviewButton } from "@/components/interview/interview-toolbar";
import { QuestionPanel } from "@/components/interview/question-panel";
import { AudioWaveform } from "@/components/interview/audio-waveform";
import { RecordDock } from "@/components/interview/record-dock";
import { TranscriptPreview } from "@/components/interview/transcript-preview";
import { ProgressBar } from "@/components/interview/progress-bar";
import { TransitionCard } from "@/components/interview/transition-card";
import { ConnectionStatus } from "@/components/interview/connection-status";
import { StageTransitionCard } from "@/components/interview/stage-transition-card";
import { VideoLayout } from "@/components/interview/video-layout";
import { CoachDrawer } from "@/components/interview/coach-drawer";
import { SelectionPopover } from "@/components/interview/selection-popover";
import { PauseOverlay } from "@/components/interview/pause-overlay";
import { useI18n } from "@/lib/i18n";

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const c = useInterviewController(id);
  const { interview, actions, phase, paused } = c;
  const question = interview.currentQuestion;

  const alerts = (
    <InterviewAlerts
      serverError={interview.error}
      errors={c.errors}
      starting={c.starting}
      micDenied={c.micDenied}
      onRetryLastAction={actions.retryLastAction}
      onDismissServerError={interview.clearError}
      onRetryStart={actions.retryStart}
      onRetryUpload={actions.retryUpload}
      onDismissSubmitError={actions.dismissSubmitError}
      onRetryRecording={actions.startRecording}
    />
  );
  const connection = (
    <ConnectionStatus status={interview.connectionStatus} onReconnect={interview.reconnect} />
  );

  if (c.stopping)
    return (
      <p className="container py-8" role="status">
        {t.interview.stop.stopping}
      </p>
    );

  if (phase === "loading" && !question) {
    return (
      <InterviewLoading
        starting={c.starting}
        startFailed={c.errors.start !== null}
        status={connection}
      >
        {alerts}
        <StopInterviewButton onStop={actions.stopInterview} />
      </InterviewLoading>
    );
  }

  if (phase === "complete") return <InterviewComplete />;

  // Company · role | step rail | timer · actions · connection. Full width above
  // the split in video mode, first item of the column in audio mode.
  const header = (
    <InterviewHeader
      companyName={c.meta?.companyName || t.interview.header.fallbackCompany}
      jobTitle={c.meta?.jobTitle || ""}
      difficulty={c.meta?.difficulty || "MID"}
      questionOrder={question?.order || 0}
      questionTotal={question?.total || 0}
      isRecording={phase === "recording"}
      paused={paused}
      actions={
        <InterviewToolbar
          coachEnabled={c.coachEnabled}
          coachOpen={c.coachOpen}
          paused={paused}
          canHold={c.canHold}
          onStop={actions.stopInterview}
          onToggleCoach={actions.toggleCoach}
          onTogglePause={actions.togglePause}
        />
      }
      progress={
        <ProgressBar
          current={question?.order || 0}
          total={question?.total || 0}
          isFollowUp={question?.isFollowUp}
        />
      }
      status={connection}
    />
  );

  const controls = (
    <>
      {!c.videoMode && header}
      {alerts}

      {/* Pause hold (inline so the question stays readable) */}
      <PauseOverlay
        open={paused}
        coachEnabled={c.coachEnabled}
        coachOpen={c.coachOpen}
        onResume={actions.resume}
        onAskCoach={actions.openCoach}
      />

      {/* Full Loop: the finished stage and the next one */}
      {interview.stageTransition && phase === "stage_transition" && (
        <StageTransitionCard
          completedStage={interview.stageTransition.completedStage}
          stageScore={interview.stageTransition.stageScore}
          nextStage={interview.stageTransition.nextStage}
        />
      )}

      {question && (
        <QuestionPanel
          question={question}
          showStage={phase !== "stage_transition"}
          playback={
            interview.audioUrl && (phase === "ready" || phase === "speaking") ? phase : null
          }
          paused={paused}
          onPlay={actions.play}
          onStopPlayback={actions.stopPlayback}
        />
      )}

      {/* The avatar replaces the waveform in video mode */}
      {!c.videoMode && (
        <AudioWaveform
          isActive={phase === "speaking" || phase === "recording"}
          audioLevel={
            phase === "recording" ? c.recorder.audioLevel : phase === "speaking" ? 0.4 : 0
          }
          variant={phase === "recording" ? "recording" : "speaking"}
        />
      )}

      <RecordDock
        phase={c.recordPhase}
        audioLevel={c.recorder.audioLevel}
        duration={c.recorder.duration}
        onStart={actions.startRecording}
        onStop={actions.stopRecording}
      />

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

      {c.coachEnabled && <SelectionPopover enabled={c.canHold} onExplain={actions.explain} />}
    </>
  );

  return (
    <div
      className={
        c.coachEnabled && c.coachOpen
          ? "mx-auto grid max-w-[100rem] items-start gap-5 px-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(18rem,30%)]"
          : "mx-auto py-6 sm:py-8"
      }
    >
      <div className="min-w-0">
        {c.videoMode ? (
          <VideoLayout
            remoteStream={c.avatar.remoteStream}
            isStreamConnected={c.avatar.isConnected}
            hasFrames={c.avatar.hasFrames}
            presenterUrl={c.avatar.presenterUrl}
            isPlaying={c.playback.isPlaying}
            avatarPhase={c.avatarPhase}
            isMockMode={c.isMock}
            webcamStream={c.webcam.stream}
            webcamActive={c.webcam.isActive}
            onWebcamToggle={actions.toggleWebcam}
            header={header}
          >
            {controls}
          </VideoLayout>
        ) : (
          <div className="container max-w-3xl space-y-5">{controls}</div>
        )}
      </div>
      {c.coachEnabled && (
        <CoachDrawer
          open={c.coachOpen}
          onClose={actions.closeCoach}
          notes={c.coach.notes}
          currentQuestionId={question?.questionId ?? null}
          draft={c.coach.draft}
          isStreaming={c.coach.isStreaming}
          error={c.coach.error}
          onAsk={actions.askCoach}
          onCancel={actions.cancelCoach}
          modelLabel={c.coach.modelLabel}
        />
      )}
    </div>
  );
}
