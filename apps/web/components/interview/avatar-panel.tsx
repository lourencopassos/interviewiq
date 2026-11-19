"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

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
  /** True while D-ID is sending frames (only during a talk). */
  hasFrames?: boolean;
  /** Presenter still, shown whenever frames are not flowing. */
  presenterUrl?: string | null;
  isPlaying: boolean;
  phase: AvatarPhase;
  isMockMode: boolean;
}

export function AvatarPanel({
  remoteStream,
  isStreamConnected,
  hasFrames = false,
  presenterUrl = null,
  isPlaying,
  phase,
  isMockMode,
}: AvatarPanelProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach remote stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (remoteStream && video) {
      // React does not reliably reflect the `muted` attribute; set the property
      // explicitly so the avatar's WebRTC audio never doubles the TTS playback.
      video.muted = true;
      video.srcObject = remoteStream;
      void video.play().catch(() => {
        // Muted autoplay is allowed; a rejection only means no frames yet
      });
    }
  }, [remoteStream]);

  const showLiveAvatar = isStreamConnected && remoteStream && !isMockMode;
  const showStill = Boolean(presenterUrl) && !isMockMode && (!showLiveAvatar || !hasFrames);
  const isSpeaking = phase === "speaking" || isPlaying;

  const phaseLabels: Record<AvatarPhase, string> = {
    speaking: t.interview.avatar.speaking,
    listening: t.interview.avatar.listening,
    thinking: t.interview.avatar.thinking,
    loading: t.interview.avatar.loading,
    fallback: t.interview.avatar.fallback,
  };

  return (
    <div className="tile relative aspect-video w-full overflow-hidden bg-sheet">
      {/* Live D-ID WebRTC avatar */}
      {showLiveAvatar && (
        <video
          ref={videoRef}
          className={cn("h-full w-full object-cover", !hasFrames && "invisible")}
          muted // Audio plays through useAudioPlayback
          playsInline
          autoPlay
        />
      )}

      {/* Presenter still: D-ID only streams frames while talking, so this covers the gaps */}
      {showStill && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={presenterUrl ?? undefined}
          alt=""
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            isSpeaking && !hasFrames && "animate-avatar-speaking",
          )}
        />
      )}

      {/* Status pill over the still when the live avatar is unavailable */}
      {showStill && phase === "fallback" && (
        <div className="absolute left-3 top-3">
          <span className="pill bg-butter text-butter-deep">{phaseLabels.fallback}</span>
        </div>
      )}

      {/* Static avatar (mock mode, fallback, or waiting for stream) */}
      {!showLiveAvatar && !showStill && (
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
            {t.interview.avatar.interviewer}
          </span>
        </div>
      )}
    </div>
  );
}
