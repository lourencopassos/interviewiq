"use client";

import { RecordButton, type RecordPhase } from "@/components/interview/record-button";
import { useI18n } from "@/lib/i18n";

interface RecordDockProps {
  phase: RecordPhase;
  audioLevel: number;
  duration: number;
  onStart: () => void;
  onStop: () => void;
}

/** The record button with its keyboard hints; sticks to the bottom edge on small screens. */
export function RecordDock({ phase, audioLevel, duration, onStart, onStop }: RecordDockProps) {
  const { t } = useI18n();

  return (
    <div className="sticky bottom-0 z-20 -mx-4 flex flex-col items-center gap-3 bg-paper/85 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <RecordButton
        phase={phase}
        audioLevel={audioLevel}
        duration={duration}
        onStart={onStart}
        onStop={onStop}
      />
      <p className="hidden items-center justify-center gap-2 pb-2 text-[10px] text-muted-foreground sm:flex print:hidden">
        <span className="kbd">Space</span> {t.interview.shortcuts.record}
        <span className="kbd ml-2">R</span> {t.interview.shortcuts.replay}
        <span className="kbd ml-2">P</span> {t.interview.shortcuts.pause}
      </p>
    </div>
  );
}
