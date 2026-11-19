"use client";

import { type ReactNode } from "react";
import { AvatarPanel } from "./avatar-panel";
import { SelfView } from "./self-view";

interface VideoLayoutProps {
  // Avatar
  remoteStream: MediaStream | null;
  isStreamConnected: boolean;
  hasFrames?: boolean;
  presenterUrl?: string | null;
  isPlaying: boolean;
  avatarPhase: "speaking" | "listening" | "thinking" | "fallback" | "loading";
  isMockMode: boolean;
  // Webcam
  webcamStream: MediaStream | null;
  webcamActive: boolean;
  onWebcamToggle: () => void;
  /** Full-width header strip rendered above the split. */
  header?: ReactNode;
  // Content
  children: ReactNode;
}

/** Meet-like split: avatar tile with the self-view pinned in it, controls beside. */
export function VideoLayout({
  remoteStream,
  isStreamConnected,
  hasFrames,
  presenterUrl,
  isPlaying,
  avatarPhase,
  isMockMode,
  webcamStream,
  webcamActive,
  onWebcamToggle,
  header,
  children,
}: VideoLayoutProps) {
  return (
    <div className="container max-w-6xl space-y-5 py-6 sm:py-8">
      {header}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
        {/* Left: Avatar panel (3/5 width on desktop) */}
        <div className="lg:col-span-3 lg:sticky lg:top-24">
          <div className="relative">
            <AvatarPanel
              remoteStream={remoteStream}
              isStreamConnected={isStreamConnected}
              hasFrames={hasFrames}
              presenterUrl={presenterUrl}
              isPlaying={isPlaying}
              phase={avatarPhase}
              isMockMode={isMockMode}
            />
            <SelfView
              stream={webcamStream}
              isActive={webcamActive}
              onToggle={onWebcamToggle}
            />
          </div>
        </div>

        {/* Right: Controls and question panel (2/5 width on desktop) */}
        <div className="lg:col-span-2">
          <div className="space-y-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
