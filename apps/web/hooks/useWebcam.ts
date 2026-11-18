"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface WebcamState {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
}

export function useWebcam() {
  const [state, setState] = useState<WebcamState>({
    stream: null,
    isActive: false,
    error: null,
  });
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false, // Audio handled by useAudioRecorder
      });
      streamRef.current = stream;
      setState({ stream, isActive: true, error: null });
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera permission denied"
          : "Failed to access camera";
      setState({ stream: null, isActive: false, error: message });
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setState({ stream: null, isActive: false, error: null });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { ...state, start, stop };
}
