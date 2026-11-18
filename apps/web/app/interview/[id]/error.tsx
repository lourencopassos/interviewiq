"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MicOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export default function InterviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

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
          <p className="eyebrow">{t.interview.errorPage.eyebrow}</p>
          <CardTitle>{t.interview.errorPage.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {t.interview.errorPage.body}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset} variant="accent">
              <RefreshCw className="h-4 w-4" />
              {t.interview.errorPage.reconnect}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/new">{t.interview.errorPage.newInterview}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
