"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw, History } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function ReportActions() {
  const { t } = useI18n();
  const copy = t.report.actions;

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6 print:hidden">
      <Button asChild variant="accent">
        <Link href="/new">
          <RotateCcw className="h-4 w-4" />
          {copy.practiceAgain}
        </Link>
      </Button>

      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        {copy.exportPdf}
      </Button>

      <Button asChild variant="ghost">
        <Link href="/history">
          <History className="h-4 w-4" />
          {copy.history}
        </Link>
      </Button>
    </div>
  );
}
