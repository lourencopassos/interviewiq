"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="border-destructive/30">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <FileWarning className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Report Unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load this interview report. It may still be generating or the session may not exist.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={reset} variant="default">
              Retry
            </Button>
            <Button variant="outline" asChild>
              <Link href="/history">View History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
