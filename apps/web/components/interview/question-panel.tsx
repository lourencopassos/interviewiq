"use client";

import { Layers } from "lucide-react";
import type { InterviewEventOf } from "@interviewiq/types";
import { QuestionCard } from "@/components/interview/question-card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface QuestionPanelProps {
  question: InterviewEventOf<"question_ready">["data"];
  /** Full Loop: show the current stage pill (hidden while the stage card is up). */
  showStage: boolean;
  /** The clip can be played or is playing; null hides the playback button. */
  playback: "ready" | "speaking" | null;
  paused: boolean;
  onPlay: () => void;
  onStopPlayback: () => void;
}

/** The current question: stage pill, the interviewer's card, and play-on-demand. */
export function QuestionPanel({
  question,
  showStage,
  playback,
  paused,
  onPlay,
  onStopPlayback,
}: QuestionPanelProps) {
  const { t } = useI18n();

  return (
    <>
      {showStage && question.stage && (
        <div className="flex justify-center">
          <span className="pill bg-lavender text-lavender-deep">
            <Layers className="h-3 w-3" aria-hidden />
            {t.interview.stages[question.stage]}
          </span>
        </div>
      )}

      {/* Keyed by id so each question pops in fresh */}
      <div data-coach-source="question">
        <QuestionCard
          key={question.questionId}
          text={question.text}
          category={question.category}
          order={question.order}
          total={question.total}
          isFollowUp={question.isFollowUp}
        />
      </div>

      {playback && (
        <Button
          variant="outline"
          size="sm"
          disabled={paused}
          onClick={playback === "speaking" ? onStopPlayback : onPlay}
        >
          {playback === "speaking" ? t.interview.record.stopAudio : t.interview.record.play}
        </Button>
      )}
    </>
  );
}
