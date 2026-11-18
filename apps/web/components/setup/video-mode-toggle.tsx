"use client";

import { useSetupStore } from "@/lib/stores/setup-store";

interface VideoModeToggleProps {
  disabled?: boolean;
}

export function VideoModeToggle({ disabled }: VideoModeToggleProps) {
  const videoMode = useSetupStore((s) => s.videoMode);
  const setVideoMode = useSetupStore((s) => s.setVideoMode);

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <div className="space-y-0.5">
        <label
          htmlFor="video-mode"
          className="text-sm font-medium text-foreground cursor-pointer"
        >
          Video Interview
        </label>
        <p className="text-xs text-muted-foreground">
          Google Meet-like experience with an AI interviewer avatar
        </p>
      </div>
      <button
        id="video-mode"
        role="switch"
        aria-checked={videoMode}
        disabled={disabled}
        onClick={() => setVideoMode(!videoMode)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          disabled:cursor-not-allowed disabled:opacity-50
          ${videoMode ? "bg-blue-600" : "bg-zinc-700"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
            transition-transform duration-200 ease-in-out
            ${videoMode ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
