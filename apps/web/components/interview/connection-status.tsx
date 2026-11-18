"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  status: "connecting" | "connected" | "reconnecting" | "error";
  /** Shown as a "Reconnect" action when the connection has given up. */
  onReconnect?: () => void;
}

const statusConfig = {
  connecting: { led: "led-live bg-butter-deep text-butter-deep/40", label: "Connecting…" },
  connected: { led: "bg-sage-deep text-sage-deep/40", label: "Connected" },
  reconnecting: { led: "led-live bg-butter-deep text-butter-deep/40", label: "Reconnecting…" },
  error: { led: "bg-blush-deep text-blush-deep/40", label: "Disconnected" },
};

/** SSE connection pill: sage LED when connected, butter while (re)connecting, blush on error. */
export function ConnectionStatus({ status, onReconnect }: ConnectionStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span className="pill bg-card text-ink-2" role="status">
        <span className={cn("led", config.led)} aria-hidden />
        {config.label}
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
          Reconnect
        </Button>
      )}
    </div>
  );
}
