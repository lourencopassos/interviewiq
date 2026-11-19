"use client";

import { Mic, Square, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/**
 * What the interview is doing right now, from the recorder's point of view.
 * - speaking:   the AI interviewer is talking — we are listening to it
 * - ready:      the user can start recording an answer
 * - recording:  the user is recording
 * - processing: the answer is being transcribed / evaluated
 * - idle:       nothing actionable yet (loading, transitions)
 */
export type RecordPhase =
  | "speaking"
  | "ready"
  | "recording"
  | "processing"
  | "idle";

interface RecordButtonProps {
  phase: RecordPhase;
  audioLevel: number;
  duration: number;
  onStart: () => void;
  onStop: () => void;
  /** Overrides the phase-derived disabled state when provided. */
  disabled?: boolean;
}

/**
 * The one big control. Ready is a sage tile that lifts and presses like the
 * accent button; recording turns blush with a pulsing ring; processing is a
 * butter tile with a quiet pulse; speaking is peach (the interviewer's colour).
 */
const tileByPhase: Record<RecordPhase, string> = {
  ready:
    "cursor-pointer bg-sage text-sage-deep shadow-pop hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-[2px] active:translate-y-[3px] active:shadow-pop-none",
  recording:
    "cursor-pointer bg-blush text-blush-deep shadow-pop active:translate-x-[2px] active:translate-y-[3px] active:shadow-pop-none",
  processing: "cursor-wait bg-butter text-butter-deep shadow-pop-sm animate-pulse",
  speaking: "cursor-not-allowed bg-peach text-peach-deep shadow-pop-sm",
  idle: "cursor-not-allowed bg-card text-muted-foreground opacity-60 shadow-pop-sm",
};

export function RecordButton({
  phase,
  audioLevel,
  duration,
  onStart,
  onStop,
  disabled,
}: RecordButtonProps) {
  const { t } = useI18n();
  const isRecording = phase === "recording";
  const isDisabled = disabled ?? (phase !== "ready" && phase !== "recording");

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Ring scale based on audio level during recording
  const ringScale = isRecording ? 1 + audioLevel * 0.3 : 1;

  const phaseLabels: Record<Exclude<RecordPhase, "recording">, string> = {
    speaking: t.interview.record.speaking,
    processing: t.interview.record.processing,
    ready: t.interview.record.ready,
    idle: t.interview.record.idle,
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Audio level ring — pulses while recording */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full transition-transform duration-75",
            isRecording && "animate-ring-pulse bg-blush",
          )}
          style={{
            transform: `scale(${ringScale})`,
          }}
        />

        <button
          type="button"
          onClick={isRecording ? onStop : onStart}
          disabled={isDisabled}
          aria-label={isRecording ? t.interview.record.stop : t.interview.record.start}
          className={cn(
            "relative z-10 flex h-20 w-20 min-h-[80px] min-w-[80px] items-center justify-center rounded-full border-1.5 border-ink",
            "transition-[transform,box-shadow,background-color,color] duration-150 ease-pop",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
            tileByPhase[phase],
            isRecording && "h-12 min-h-12 w-auto gap-2 rounded-md px-5",
          )}
        >
          {isRecording ? (
            <><Square className="h-4 w-4" fill="currentColor" />{t.interview.record.stop}</>
          ) : phase === "processing" ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : phase === "speaking" ? (
            <Volume2 className="h-7 w-7" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </button>
      </div>

      <span className="text-[12px] font-semibold text-ink-2" aria-live="polite">
        {isRecording ? (
          <span className="flex items-center gap-2">
            <span className="led led-live bg-rust text-rust/40" aria-hidden />
            {t.interview.record.recording} <span className="tabular-nums">{timeStr}</span>
          </span>
        ) : (
          phaseLabels[phase]
        )}
      </span>
    </div>
  );
}
