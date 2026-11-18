"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic } from "lucide-react";

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
      <Card className="border-destructive/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Mic className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Interview Session Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Something went wrong during the interview. Your progress has been saved.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={reset} variant="default">
              Reconnect
            </Button>
            <Button variant="outline" asChild>
              <Link href="/new">Start New Interview</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
