"use client";

import { Check } from "lucide-react";
import { useSetupStore } from "@/lib/stores/setup-store";
import { cn } from "@/lib/utils";

type StepStatus = "pending" | "active" | "completed";

interface LogLineProps {
  index: string;
  label: string;
  status: StepStatus;
}

/** One line of the job log: index, command, and a status token on the right. */
function LogLine({ index, label, status }: LogLineProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-[12.5px]",
        status === "pending" && "text-muted-foreground/60",
        status === "active" && "bg-paper-2 text-ink",
        status === "completed" && "text-ink-2",
      )}
      aria-current={status === "active" ? "step" : undefined}
    >
      <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{index}</span>
      <span className="shrink-0 text-muted-foreground" aria-hidden>
        $
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {label}
        {status === "active" && (
          <span
            className="ml-1 inline-block h-[1em] w-[0.55ch] translate-y-[2px] bg-ink animate-caret"
            aria-hidden
          />
        )}
      </span>

      {status === "completed" && (
        <span
          key="done"
          className="pill animate-pop-in bg-sage text-sage-deep"
        >
          <Check className="h-3 w-3" aria-hidden /> done
        </span>
      )}
      {status === "active" && (
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-rust">
          <span className="led led-live bg-rust text-rust/40" aria-hidden />
          running
        </span>
      )}
      {status === "pending" && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
          queued
        </span>
      )}
    </li>
  );
}

export function AnalysisProgress() {
  const { step } = useSetupStore();

  if (step === "input" || step === "error") return null;

  const getStatus = (target: string): StepStatus => {
    const order = ["parsing", "researching", "ready"];
    const currentIdx = order.indexOf(step);
    const targetIdx = order.indexOf(target);

    if (targetIdx < currentIdx) return "completed";
    if (targetIdx === currentIdx) return step === "ready" ? "completed" : "active";
    return "pending";
  };

  const finished = step === "ready";

  return (
    <div
      className="tile overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label="Analysis progress"
    >
      <div className="flex items-center justify-between border-b-1.5 border-ink bg-sheet px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          <span
            className={cn(
              "led",
              finished ? "bg-sage-deep text-sage-deep/40" : "led-live bg-rust text-rust/40",
            )}
            aria-hidden
          />
          analysis · job log
        </span>
        <span className={cn("pill", finished ? "bg-sage text-sage-deep" : "bg-butter text-butter-deep")}>
          {finished ? "ready" : "working"}
        </span>
      </div>
      <ol className="divide-y divide-line">
        <LogLine index="01" label="Parse the posting" status={getStatus("parsing")} />
        <LogLine index="02" label="Research the company" status={getStatus("researching")} />
        <LogLine index="03" label="Ready to start" status={getStatus("ready")} />
      </ol>
    </div>
  );
}
