"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type AvatarPhase =
  | "speaking"
  | "listening"
  | "thinking"
  | "fallback"
  | "loading";

interface AvatarPanelProps {
  /** Remote WebRTC MediaStream from D-ID (null = not yet connected or mock mode) */
  remoteStream: MediaStream | null;
  /** Whether the avatar WebRTC connection is established */
  isStreamConnected: boolean;
  isPlaying: boolean;
  phase: AvatarPhase;
  isMockMode: boolean;
}

const phaseLabels: Record<AvatarPhase, string> = {
  speaking: "Speaking…",
  listening: "Listening",
  thinking: "Processing…",
  loading: "Connecting avatar…",
  fallback: "Audio mode",
};

export function AvatarPanel({
  remoteStream,
  isStreamConnected,
  isPlaying,
  phase,
  isMockMode,
}: AvatarPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach remote stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (remoteStream && video) {
      // React does not reliably reflect the `muted` attribute; set the property
      // explicitly so the avatar's WebRTC audio never doubles the TTS playback.
      video.muted = true;
      video.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const showLiveAvatar = isStreamConnected && remoteStream && !isMockMode;
  const isSpeaking = phase === "speaking" || isPlaying;

  return (
    <div className="tile relative aspect-video w-full overflow-hidden bg-sheet">
      {/* Live D-ID WebRTC avatar */}
      {showLiveAvatar && (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted // Audio plays through useAudioPlayback
          playsInline
          autoPlay
        />
      )}

      {/* Static avatar (mock mode, fallback, or waiting for stream) */}
      {!showLiveAvatar && (
        <div className="flex h-full w-full items-center justify-center">
          <div
            className={cn(
              "flex h-32 w-32 items-center justify-center rounded-full border-1.5 border-ink bg-peach text-peach-deep shadow-pop",
              isSpeaking && "animate-avatar-speaking",
              phase === "listening" && !isSpeaking && "animate-avatar-idle",
              phase === "thinking" && "animate-pulse",
            )}
          >
            <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          {/* Status indicator (top-left so it never sits under the self-view) */}
          <div className="absolute left-3 top-3">
            <span className="pill bg-card text-ink-2">{phaseLabels[phase]}</span>
          </div>
        </div>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute bottom-3 right-3">
          <span className="pill bg-peach text-peach-deep">
            <span className="led led-live bg-peach-deep text-peach-deep/40" aria-hidden />
            AI Interviewer
          </span>
        </div>
      )}
    </div>
  );
}
