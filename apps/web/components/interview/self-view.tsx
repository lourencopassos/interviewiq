"use client";

import { useRef, useEffect } from "react";
import { Video, VideoOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface SelfViewProps {
  stream: MediaStream | null;
  isActive: boolean;
  onToggle: () => void;
}

/** Small picture-in-picture tile of the candidate's webcam, mirrored. */
export function SelfView({ stream, isActive, onToggle }: SelfViewProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="absolute bottom-3 left-3 z-10">
      <div className="tile-pop relative h-24 w-32 overflow-hidden bg-sheet">
        {isActive && stream ? (
          <video
            ref={videoRef}
            className="h-full w-full -scale-x-100 object-cover"
            muted
            autoPlay
            playsInline
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <VideoOff className="h-7 w-7" strokeWidth={1.5} aria-hidden />
          </div>
        )}

        {/* Toggle button */}
        <button
          type="button"
          onClick={onToggle}
          className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-md border-1.5 border-ink bg-card text-ink shadow-pop-sm transition-colors hover:bg-sheet"
          aria-label={isActive ? t.interview.selfView.turnOff : t.interview.selfView.turnOn}
        >
          {isActive ? (
            <Video className="h-3 w-3" aria-hidden />
          ) : (
            <VideoOff className="h-3 w-3" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
