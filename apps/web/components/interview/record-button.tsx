"use client";

import { Mic, Square } from "lucide-react";

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

const phaseLabels: Record<Exclude<RecordPhase, "recording">, string> = {
  speaking: "Listening…",
  processing: "Processing…",
  ready: "Record answer",
  idle: "Please wait…",
};

export function RecordButton({
  phase,
  audioLevel,
  duration,
  onStart,
  onStop,
  disabled,
}: RecordButtonProps) {
  const isRecording = phase === "recording";
  const isDisabled = disabled ?? (phase !== "ready" && phase !== "recording");

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Ring scale based on audio level during recording
  const ringScale = isRecording ? 1 + audioLevel * 0.3 : 1;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Audio level ring */}
        <div
          className={`absolute inset-0 rounded-full transition-transform duration-75 ${
            isRecording ? "bg-red-500/20" : ""
          }`}
          style={{
            transform: `scale(${ringScale})`,
          }}
        />

        <button
          type="button"
          onClick={isRecording ? onStop : onStart}
          disabled={isDisabled}
          aria-label={isRecording ? "Stop recording" : "Record answer"}
          className={`relative z-10 flex h-16 w-16 sm:h-16 sm:w-16 min-h-[64px] min-w-[64px] items-center justify-center rounded-full transition-all ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25"
              : "bg-foreground hover:bg-foreground/90 shadow-lg"
          } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {isRecording ? (
            <Square className="h-6 w-6 text-white" fill="white" />
          ) : (
            <Mic className="h-6 w-6 text-background" />
          )}
        </button>
      </div>

      <span className="text-sm text-muted-foreground" aria-live="polite">
        {isRecording ? (
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Recording {timeStr}
          </span>
        ) : (
          phaseLabels[phase]
        )}
      </span>
    </div>
  );
}
