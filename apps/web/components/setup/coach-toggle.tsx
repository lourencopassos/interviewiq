"use client";

import { MessageCircleQuestion } from "lucide-react";
import { useSetupStore } from "@/lib/stores/setup-store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CoachToggleProps {
  disabled?: boolean;
}

/**
 * Lets the candidate opt out of the in-interview coach. On by default; the
 * lavender tile follows the "system / report" pastel meaning.
 */
export function CoachToggle({ disabled }: CoachToggleProps) {
  const { t } = useI18n();
  const coachEnabled = useSetupStore((s) => s.coachEnabled);
  const setCoachEnabled = useSetupStore((s) => s.setCoachEnabled);

  return (
    <div className="sheet flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-1.5 border-ink shadow-pop-sm transition-colors duration-150",
          coachEnabled ? "bg-lavender text-lavender-deep" : "bg-card text-ink-2",
        )}
        aria-hidden
      >
        <MessageCircleQuestion className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1 space-y-0.5">
        <label
          htmlFor="coach-enabled"
          className="block cursor-pointer text-[13px] font-semibold text-ink"
        >
          {t.setup.coach.title}
        </label>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t.setup.coach.body}
        </p>
      </div>

      <button
        id="coach-enabled"
        role="switch"
        aria-checked={coachEnabled}
        disabled={disabled}
        onClick={() => setCoachEnabled(!coachEnabled)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-1.5 border-ink p-0.5",
          "transition-colors duration-150 ease-pop",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-sheet",
          "disabled:cursor-not-allowed disabled:opacity-50",
          coachEnabled ? "bg-sage" : "bg-paper-2",
        )}
      >
        <span className="sr-only">{coachEnabled ? t.setup.coach.on : t.setup.coach.off}</span>
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full border-1.5 border-ink shadow-pop-sm",
            "transition-transform duration-150 ease-pop",
            coachEnabled ? "translate-x-5 bg-sage-deep" : "translate-x-0 bg-card",
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}
