"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="container max-w-lg py-24">
      <div className="tile-pop bg-blush p-6 text-blush-deep sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-current opacity-80">[ error ] something broke</p>
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        </div>
        <h1 className="mt-2 text-2xl text-current">That didn&apos;t go as planned.</h1>
        <p className="mt-2 text-[13px] leading-relaxed opacity-90">
          An unexpected error stopped this page. Trying again usually fixes it.
        </p>
        {error.digest && (
          <p className="mt-3 text-[11px] tabular-nums opacity-70">ref {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
