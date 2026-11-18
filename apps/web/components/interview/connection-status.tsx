"use client";

import { RefreshCw } from "lucide-react";

interface ConnectionStatusProps {
  status: "connecting" | "connected" | "reconnecting" | "error";
  /** Shown as a "Reconnect" action when the connection has given up. */
  onReconnect?: () => void;
}

const statusConfig = {
  connecting: { color: "bg-yellow-500", label: "Connecting..." },
  connected: { color: "bg-green-500", label: "Connected" },
  reconnecting: { color: "bg-yellow-500", label: "Reconnecting..." },
  error: { color: "bg-red-500", label: "Disconnected" },
};

export function ConnectionStatus({ status, onReconnect }: ConnectionStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={`h-2 w-2 rounded-full ${config.color} ${
          status === "connecting" || status === "reconnecting"
            ? "animate-pulse"
            : ""
        }`}
      />
      <span>{config.label}</span>
      {status === "error" && onReconnect && (
        <button
          type="button"
          onClick={onReconnect}
          className="ml-1 inline-flex items-center gap-1 rounded-md border border-input px-2 py-0.5 text-xs text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          Reconnect
        </button>
      )}
    </div>
  );
}
