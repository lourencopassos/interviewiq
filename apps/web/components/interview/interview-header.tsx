"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface InterviewHeaderProps {
  companyName: string;
  jobTitle: string;
  difficulty: string;
  questionOrder: number;
  questionTotal: number;
  /** Lights the live LED next to the title while the candidate is recording. */
  isRecording?: boolean;
  /** Step rail / progress, rendered in the middle of the strip. */
  progress?: ReactNode;
  /** Connection pill, rendered at the far right. */
  status?: ReactNode;
  /** Pause / coach controls, rendered before the connection pill. */
  actions?: ReactNode;
  /** Freezes the elapsed timer. */
  paused?: boolean;
}

const difficultyTone: Record<string, "sage" | "sky" | "butter" | "lavender"> = {
  JUNIOR: "sage",
  MID: "sky",
  SENIOR: "butter",
  STAFF: "lavender",
};

/**
 * The interview page's top bar (the site nav is hidden on this route): a sticky
 * tile strip with company · role on the left, the step rail in the middle and
 * the elapsed timer + connection pill on the right.
 */
export function InterviewHeader({
  companyName,
  jobTitle,
  difficulty,
  questionOrder,
  questionTotal,
  isRecording = false,
  progress,
  status,
  actions,
  paused = false,
}: InterviewHeaderProps) {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [paused]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const difficultyLabel =
    (t.common.difficulty as Record<string, string>)[difficulty] ?? difficulty;

  return (
    <div className="sticky top-0 z-30 -mx-2 bg-paper/90 px-2 pb-2 pt-2 backdrop-blur-md">
      <header className="tile flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-5">
        {/* Left: company · role */}
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "led shrink-0",
              isRecording
                ? "led-live bg-rust text-rust/40"
                : "bg-sage-deep text-sage-deep/40",
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] leading-tight">{companyName}</h1>
              <Badge
                variant={difficultyTone[difficulty] ?? "outline"}
                className="hidden sm:inline-flex"
              >
                {difficultyLabel}
              </Badge>
            </div>
            {jobTitle && (
              <p className="truncate text-[12px] leading-snug text-muted-foreground">
                {jobTitle}
              </p>
            )}
          </div>
        </div>

        {/* Middle: step rail (drops to its own row on small screens) */}
        {progress && (
          <div className="order-last w-full basis-full md:order-none md:w-auto md:flex-1 md:basis-auto md:px-2">
            {progress}
          </div>
        )}

        {/* Right: counter, timer, connection */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
            {questionOrder}/{questionTotal}
          </span>
          <time
            className={cn(
              "rounded-md border border-line-strong bg-sheet px-2 py-0.5 text-[12px] font-semibold tabular-nums text-ink-2",
              paused && "border-ink bg-butter text-butter-deep",
            )}
            aria-label={t.interview.header.elapsed}
          >
            {timeStr}
          </time>
          {actions}
          {status}
        </div>
      </header>
    </div>
  );
}
