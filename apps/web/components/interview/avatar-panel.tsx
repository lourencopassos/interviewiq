"use client";

import { useRef, useEffect } from "react";

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

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
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
            className={`
              relative h-32 w-32 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700
              flex items-center justify-center text-4xl
              ${phase === "speaking" || isPlaying ? "animate-avatar-speaking" : ""}
              ${phase === "listening" ? "animate-avatar-idle" : ""}
              ${phase === "thinking" ? "animate-pulse" : ""}
            `}
          >
            <svg
              className="h-16 w-16 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          {/* Status indicator */}
          <div className="absolute bottom-4 left-4">
            <span className="text-xs text-zinc-400">
              {phase === "speaking" && "Speaking..."}
              {phase === "listening" && "Listening"}
              {phase === "thinking" && "Processing..."}
              {phase === "loading" && "Connecting avatar..."}
              {phase === "fallback" && "Audio mode"}
            </span>
          </div>
        </div>
      )}

      {/* Speaking indicator dot */}
      {(phase === "speaking" || isPlaying) && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-zinc-400">AI Interviewer</span>
        </div>
      )}
    </div>
  );
}
