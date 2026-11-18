"use client";

interface AudioWaveformProps {
  isActive: boolean;
  audioLevel: number;
  variant: "speaking" | "recording";
}

export function AudioWaveform({ isActive, audioLevel, variant }: AudioWaveformProps) {
  const barCount = 24;
  const baseColor = variant === "speaking" ? "bg-blue-500" : "bg-red-500";

  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: barCount }).map((_, i) => {
        // Create a wave pattern based on position
        const position = Math.abs(i - barCount / 2) / (barCount / 2);
        const baseHeight = isActive ? 0.2 + (1 - position) * 0.3 : 0.1;
        const dynamicHeight = isActive ? audioLevel * (1 - position * 0.5) : 0;
        const height = Math.min(1, baseHeight + dynamicHeight);

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              isActive ? baseColor : "bg-muted-foreground/30"
            }`}
            style={{
              height: `${Math.max(4, height * 64)}px`,
              opacity: isActive ? 0.6 + height * 0.4 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}
