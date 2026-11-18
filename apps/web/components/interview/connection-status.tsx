"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Status = "connecting" | "connected" | "reconnecting" | "error";

interface ConnectionStatusProps {
  status: Status;
  /** Shown as a "Reconnect" action when the connection has given up. */
  onReconnect?: () => void;
}

const statusLed: Record<Status, string> = {
  connecting: "led-live bg-butter-deep text-butter-deep/40",
  connected: "bg-sage-deep text-sage-deep/40",
  reconnecting: "led-live bg-butter-deep text-butter-deep/40",
  error: "bg-blush-deep text-blush-deep/40",
};

/** SSE connection pill: sage LED when connected, butter while (re)connecting, blush on error. */
export function ConnectionStatus({ status, onReconnect }: ConnectionStatusProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className="pill bg-card text-ink-2" role="status">
        <span className={cn("led", statusLed[status])} aria-hidden />
        {t.interview.connection[status]}
      </span>
      {status === "error" && onReconnect && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onReconnect}
          className="h-7 gap-1 px-2 text-[11px]"
        >
          <RefreshCw className="h-3 w-3" />
          {t.interview.connection.reconnect}
        </Button>
      )}
    </div>
  );
}
