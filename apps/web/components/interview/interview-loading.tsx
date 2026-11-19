"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

interface InterviewLoadingProps {
  /** Alerts and the stop button, shown above the placeholders. */
  children: ReactNode;
  starting: boolean;
  startFailed: boolean;
  /** Connection pill. */
  status: ReactNode;
}

/** Skeleton of the interview while `/start` runs and the first question is on its way. */
export function InterviewLoading({
  children,
  starting,
  startFailed,
  status,
}: InterviewLoadingProps) {
  const { t } = useI18n();

  return (
    <div className="container max-w-3xl py-8 sm:py-12">
      <div className="space-y-5">
        {children}
        {/* Header strip placeholder */}
        <div className="tile flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-14" />
        </div>
        {/* Question placeholder */}
        <div className="tile p-5 sm:p-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
      </div>
      <p className="mt-8 flex items-center justify-center gap-2 text-center text-[12px] font-semibold text-muted-foreground">
        {!startFailed && (
          <span className="led led-live bg-sage-deep text-sage-deep/40" aria-hidden />
        )}
        {startFailed
          ? t.interview.loading.notStarted
          : starting
            ? t.interview.loading.generating
            : t.interview.loading.connecting}
      </p>
      <div className="mt-4 flex justify-center">{status}</div>
    </div>
  );
}
