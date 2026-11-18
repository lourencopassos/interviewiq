"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MicOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InterviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Interview error:", error);
  }, [error]);

  return (
    <div className="container max-w-lg py-24">
      <Card tone="paper" pop className="animate-pop-in">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-md border-1.5 border-ink bg-blush text-blush-deep shadow-pop-sm">
            <MicOff className="h-6 w-6" />
          </div>
          <p className="eyebrow">Interview session</p>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Something went wrong during the interview. Your progress has been saved.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset} variant="accent">
              <RefreshCw className="h-4 w-4" />
              Reconnect
            </Button>
            <Button variant="outline" asChild>
              <Link href="/new">Start new interview</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
