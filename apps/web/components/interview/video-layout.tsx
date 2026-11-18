"use client";

import { type ReactNode } from "react";
import { AvatarPanel } from "./avatar-panel";
import { SelfView } from "./self-view";

interface VideoLayoutProps {
  // Avatar
  remoteStream: MediaStream | null;
  isStreamConnected: boolean;
  isPlaying: boolean;
  avatarPhase: "speaking" | "listening" | "thinking" | "fallback" | "loading";
  isMockMode: boolean;
  // Webcam
  webcamStream: MediaStream | null;
  webcamActive: boolean;
  onWebcamToggle: () => void;
  // Content
  children: ReactNode;
}

export function VideoLayout({
  remoteStream,
  isStreamConnected,
  isPlaying,
  avatarPhase,
  isMockMode,
  webcamStream,
  webcamActive,
  onWebcamToggle,
  children,
}: VideoLayoutProps) {
  return (
    <div className="container max-w-6xl py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Avatar panel (3/5 width on desktop) */}
        <div className="lg:col-span-3">
          <div className="relative">
            <AvatarPanel
              remoteStream={remoteStream}
              isStreamConnected={isStreamConnected}
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
          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
