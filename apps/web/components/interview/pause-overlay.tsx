"use client";

import { GraduationCap, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface PauseOverlayProps {
  open: boolean;
  coachEnabled: boolean;
  coachOpen: boolean;
  onResume: () => void;
  onAskCoach: () => void;
}

/**
 * Inline pause state, shown between the header and the question so the
 * question stays readable (and highlightable for the coach). Nothing runs on
 * the server while paused: the timer stops and recording is blocked.
 */
export function PauseOverlay({ open, coachEnabled, coachOpen, onResume, onAskCoach }: PauseOverlayProps) {
  const { t } = useI18n();
  const P = t.interview.pause;
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="tile-pop flex flex-col gap-4 bg-butter p-4 text-butter-deep animate-pop-in sm:flex-row sm:items-center print:hidden"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-1.5 border-ink bg-card text-butter-deep shadow-pop-sm">
        <Pause className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-lg leading-tight text-butter-deep">{P.title}</h2>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-butter-deep/80">
            <span className="led bg-butter-deep text-butter-deep/40" aria-hidden />
            {P.noTokens}
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed">{P.body}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {coachEnabled && !coachOpen && (
          <Button variant="outline" onClick={onAskCoach} className="bg-lavender text-lavender-deep">
            <GraduationCap className="h-4 w-4" /> {P.askCoach}
          </Button>
        )}
        <Button variant="accent" onClick={onResume}>
          <Play className="h-4 w-4" /> {P.resume}
          <span className="kbd ml-1">P</span>
        </Button>
      </div>
    </div>
  );
}
