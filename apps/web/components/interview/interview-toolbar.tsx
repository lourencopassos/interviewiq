"use client";

import { GraduationCap, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/** "Stop interview" with its Escape hint; also shown on the loading view. */
export function StopInterviewButton({ onStop }: { onStop: () => void }) {
  const { t } = useI18n();
  return (
    <Button size="sm" variant="destructive" onClick={onStop} aria-keyshortcuts="Escape">
      <Square className="h-3.5 w-3.5" /> {t.interview.stop.button}
      <span className="kbd hidden sm:inline">Esc</span>
    </Button>
  );
}

interface InterviewToolbarProps {
  coachEnabled: boolean;
  coachOpen: boolean;
  paused: boolean;
  /** Pause and the coach are available right now. */
  canHold: boolean;
  onStop: () => void;
  onToggleCoach: () => void;
  onTogglePause: () => void;
}

/** The header's action buttons: stop, coach and pause / resume. */
export function InterviewToolbar({
  coachEnabled,
  coachOpen,
  paused,
  canHold,
  onStop,
  onToggleCoach,
  onTogglePause,
}: InterviewToolbarProps) {
  const { t } = useI18n();
  const pauseLabel = paused ? t.interview.pause.resume : t.interview.pause.button;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StopInterviewButton onStop={onStop} />
      {coachEnabled && (
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleCoach}
          disabled={!canHold}
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
        onClick={onTogglePause}
        disabled={!canHold}
        aria-pressed={paused}
        title={pauseLabel}
      >
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        <span className="hidden md:inline">{pauseLabel}</span>
      </Button>
    </div>
  );
}
