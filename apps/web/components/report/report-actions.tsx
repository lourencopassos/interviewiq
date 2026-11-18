"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw, History } from "lucide-react";

interface ReportActionsProps {
  sessionId: string;
}

export function ReportActions({ sessionId }: ReportActionsProps) {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <Link href="/new">
        <Button variant="default" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Practice Again
        </Button>
      </Link>

      <Button
        variant="outline"
        className="gap-2"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        Export PDF
      </Button>

      <Link href="/history">
        <Button variant="outline" className="gap-2">
          <History className="h-4 w-4" />
          View History
        </Button>
      </Link>
    </div>
  );
}
