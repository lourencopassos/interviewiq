"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { interpolate, useI18n } from "@/lib/i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  const copy = t.errors.global;

  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="container max-w-lg py-24">
      <div className="tile-pop bg-blush p-6 text-blush-deep sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-current opacity-80">{copy.eyebrow}</p>
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        </div>
        <h1 className="mt-2 text-2xl text-current">{copy.title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed opacity-90">{copy.body}</p>
        {error.digest && (
          <p className="mt-3 text-[11px] tabular-nums opacity-70">
            {interpolate(t.errors.ref, { digest: error.digest })}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>{copy.tryAgain}</Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            {copy.goHome}
          </Button>
        </div>
      </div>
    </div>
  );
}
