"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw, History } from "lucide-react";

interface ReportActionsProps {
  sessionId: string;
}

export function ReportActions({ sessionId }: ReportActionsProps) {
  return (
    <div
      data-session-id={sessionId}
      className="flex flex-wrap items-center gap-3 border-t border-line pt-6 print:hidden"
    >
      <Button asChild variant="accent">
        <Link href="/new">
          <RotateCcw className="h-4 w-4" />
          Practice again
        </Link>
      </Button>

      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Export PDF
      </Button>

      <Button asChild variant="ghost">
        <Link href="/history">
          <History className="h-4 w-4" />
          History
        </Link>
      </Button>
    </div>
  );
}
