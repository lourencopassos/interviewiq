"use client";

import { Check, Loader2 } from "lucide-react";
import { useSetupStore } from "@/lib/stores/setup-store";

interface StepIndicatorProps {
  label: string;
  status: "pending" | "active" | "completed";
}

function StepIndicator({ label, status }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border">
        {status === "completed" && (
          <Check className="h-4 w-4 text-green-500" />
        )}
        {status === "active" && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
        {status === "pending" && (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <span
        className={
          status === "active"
            ? "text-sm font-medium text-foreground"
            : status === "completed"
              ? "text-sm text-muted-foreground"
              : "text-sm text-muted-foreground/50"
        }
      >
        {label}
      </span>
    </div>
  );
}

export function AnalysisProgress() {
  const { step } = useSetupStore();

  if (step === "input" || step === "error") return null;

  const getStatus = (
    target: string,
  ): "pending" | "active" | "completed" => {
    const order = ["parsing", "researching", "ready"];
    const currentIdx = order.indexOf(step);
    const targetIdx = order.indexOf(target);

    if (targetIdx < currentIdx) return "completed";
    if (targetIdx === currentIdx) return step === "ready" ? "completed" : "active";
    return "pending";
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <StepIndicator
        label="Parsing job description..."
        status={getStatus("parsing")}
      />
      <StepIndicator
        label="Researching company..."
        status={getStatus("researching")}
      />
      <StepIndicator label="Ready to start" status={getStatus("ready")} />
    </div>
  );
}
