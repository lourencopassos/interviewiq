"use client";

import { cn } from "@/lib/utils";
import { interpolate, useI18n } from "@/lib/i18n";

interface AudioWaveformProps {
  isActive: boolean;
  audioLevel: number;
  variant: "speaking" | "recording";
}

const BAR_COUNT = 28;

/**
 * Bars in the candidate's sky while recording, the interviewer's peach while
 * the question plays; staggered wave animation when active, flat line when idle.
 * The mic level nudges the bar heights so the wave reacts to the voice.
 */
export function AudioWaveform({ isActive, audioLevel, variant }: AudioWaveformProps) {
  const { t } = useI18n();
  const barColor = variant === "recording" ? "bg-sky-deep" : "bg-peach-deep";
  const label =
    variant === "recording" ? t.interview.waveform.listening : t.interview.waveform.interviewer;
  const level = Math.min(1, Math.max(0, audioLevel));

  return (
    <div
      className="flex h-16 items-center justify-center gap-[3px]"
      role="img"
      aria-label={
        isActive
          ? interpolate(t.interview.waveform.active, { label })
          : t.interview.waveform.idle
      }
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        // 0 at the centre, ~1 at the edges — the wave is tallest in the middle
        const position = Math.abs(i - (BAR_COUNT - 1) / 2) / (BAR_COUNT / 2);
        const base = 10 + ((i * 7) % 18);
        const height = isActive
          ? Math.round(base * (1 - position * 0.35) + level * 22 * (1 - position * 0.5))
          : 4;

        return (
          <span
            key={i}
            className={cn(
              "block w-[3px] origin-center rounded-full transition-[height] duration-100",
              isActive ? cn(barColor, "animate-wave-bar") : "bg-line-strong",
            )}
            style={{
              height: `${height}px`,
              animationDelay: isActive ? `${(i % 7) * 90}ms` : undefined,
              animationDuration: isActive ? `${700 + (i % 5) * 110}ms` : undefined,
            }}
          />
        );
      })}
      {isActive && <span className="eyebrow ml-3">{label}</span>}
    </div>
  );
}
