"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileWarning } from "lucide-react";

export default function ReportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Report error:", error);
  }, [error]);

  return (
    <div className="container max-w-lg py-24">
      <div className="tile-pop bg-blush p-6 text-blush-deep sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-current opacity-80">[ report ] unavailable</p>
          <FileWarning className="h-4 w-4 shrink-0" aria-hidden />
        </div>
        <h1 className="mt-2 text-2xl text-current">This report didn&apos;t load.</h1>
        <p className="mt-2 text-[13px] leading-relaxed opacity-90">
          It may still be generating, or the session may no longer exist.
        </p>
        {error.digest && (
          <p className="mt-3 text-[11px] tabular-nums opacity-70">ref {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" asChild>
            <Link href="/history">Back to history</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
