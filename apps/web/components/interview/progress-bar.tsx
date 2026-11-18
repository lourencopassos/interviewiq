"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  total: number;
  /** Renders the current node as a smaller lavender follow-up marker. */
  isFollowUp?: boolean;
}

/**
 * Numbered step rail, like the reference's "IN THIS LESSON" rail: done steps
 * filled ink, the current step sage, upcoming steps outlined, joined by a line
 * that is solid where the candidate has been and dashed where they have not.
 */
export function ProgressBar({ current, total, isFollowUp = false }: ProgressBarProps) {
  if (total <= 0) return null;

  // Long sessions (follow-ups grow the total) collapse to unnumbered dots.
  const compact = total > 12;
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <nav aria-label={`Question ${current} of ${total}`} className="w-full">
      <ol className="flex w-full items-center">
        {steps.map((n) => {
          const done = n < current;
          const active = n === current;
          const followNode = active && isFollowUp;
          return (
            <li key={n} className={cn("flex items-center", n < total && "flex-1")}>
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full border-1.5 border-ink font-bold tabular-nums transition-colors duration-300",
                  compact
                    ? "h-2.5 w-2.5"
                    : followNode
                      ? "h-5 w-5 text-[9px]"
                      : "h-6 w-6 text-[10px]",
                  done && "bg-ink text-paper",
                  active && !followNode && "bg-sage text-sage-deep shadow-pop-sm",
                  followNode && "border-dashed bg-lavender text-lavender-deep",
                  !done && !active && "bg-card text-muted-foreground",
                )}
              >
                {!compact && (followNode ? "↳" : n)}
              </span>
              {n < total && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1 h-0 flex-1 border-t-1.5",
                    done ? "border-solid border-ink" : "border-dashed border-line-strong",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
