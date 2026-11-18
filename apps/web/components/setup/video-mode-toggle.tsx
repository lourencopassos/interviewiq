"use client";

import { Video } from "lucide-react";
import { useSetupStore } from "@/lib/stores/setup-store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface VideoModeToggleProps {
  disabled?: boolean;
}

export function VideoModeToggle({ disabled }: VideoModeToggleProps) {
  const { t } = useI18n();
  const videoMode = useSetupStore((s) => s.videoMode);
  const setVideoMode = useSetupStore((s) => s.setVideoMode);

  return (
    <div className="sheet flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-1.5 border-ink shadow-pop-sm transition-colors duration-150",
          videoMode ? "bg-peach text-peach-deep" : "bg-card text-ink-2",
        )}
        aria-hidden
      >
        <Video className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1 space-y-0.5">
        <label
          htmlFor="video-mode"
          className="block cursor-pointer text-[13px] font-semibold text-ink"
        >
          {t.setup.video.label}
        </label>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t.setup.video.body}
        </p>
      </div>

      <button
        id="video-mode"
        role="switch"
        aria-checked={videoMode}
        disabled={disabled}
        onClick={() => setVideoMode(!videoMode)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-1.5 border-ink p-0.5",
          "transition-colors duration-150 ease-pop",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-sheet",
          "disabled:cursor-not-allowed disabled:opacity-50",
          videoMode ? "bg-sage" : "bg-paper-2",
        )}
      >
        <span className="sr-only">{videoMode ? t.setup.video.on : t.setup.video.off}</span>
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full border-1.5 border-ink shadow-pop-sm",
            "transition-transform duration-150 ease-pop",
            videoMode ? "translate-x-5 bg-sage-deep" : "translate-x-0 bg-card",
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}
