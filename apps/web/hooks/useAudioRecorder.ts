"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ClientError } from "@/lib/errors";

type PermissionState = "prompt" | "granted" | "denied" | "unknown";

interface AudioRecorderState {
  isRecording: boolean;
  duration: number;
  audioLevel: number;
  permissionState: PermissionState;
}

/** Preferred container/codec combinations, most desirable first. */
const MIME_TYPE_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

/**
 * Returns the first mime type this browser's MediaRecorder supports,
 * or undefined to let the browser pick its default.
 */
export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  if (typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  for (const candidate of MIME_TYPE_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      // Some browsers throw for unknown types; keep trying.
    }
  }
  return undefined;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    duration: 0,
    audioLevel: 0,
    permissionState: "unknown",
  });

  // Check microphone permission on mount
  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    async function checkPermission() {
      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          permissionStatus = result;
          setState((prev) => ({
            ...prev,
            permissionState: result.state as PermissionState,
          }));
          result.onchange = () => {
            setState((prev) => ({
              ...prev,
              permissionState: result.state as PermissionState,
            }));
          };
        }
      } catch {
        // permissions.query not supported for microphone in some browsers
        setState((prev) => ({ ...prev, permissionState: "unknown" }));
      }
    }
    checkPermission();

    return () => {
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const captureGeneration = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string | undefined>(undefined);

  /** Release every resource held by the current/last recording. */
  const releaseResources = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    analyserRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close().catch(() => {
        // Already closing — nothing to do
      });
    }

    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const level = Math.min(1, rms * 3); // Scale up for visual effect

    setState((prev) => ({ ...prev, audioLevel: level }));
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  /**
   * Ask for the microphone and start capturing. Rejects with the browser's
   * DOMException (NotAllowedError, NotFoundError, or AbortError when
   * `cancelRecording` won the race) or whatever MediaRecorder threw.
   */
  const startRecording = useCallback(async () => {
    // Never allow two concurrent recordings
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      return;
    }

    const generation = ++captureGeneration.current;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setState((prev) => ({ ...prev, permissionState: "denied" }));
      }
      console.error("Failed to access microphone:", error);
      throw error;
    }

    if (generation !== captureGeneration.current) {
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException("Recording canceled", "AbortError");
    }

    try {
      streamRef.current = stream;

      // Set up analyser for audio levels
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder with the best supported mime type
      const mimeType = pickRecorderMimeType();
      mimeTypeRef.current = mimeType;
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();

      // Start duration timer
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 1000);

      setState((prev) => ({
        ...prev,
        isRecording: true,
        duration: 0,
        audioLevel: 0,
        permissionState: "granted",
      }));
      updateAudioLevel();
    } catch (error) {
      releaseResources();
      mediaRecorderRef.current = null;
      console.error("Failed to start recording:", error);
      throw error;
    }
  }, [updateAudioLevel, releaseResources]);

  /** Stop capturing and resolve with the recording; rejects with ClientError("RECORD_FAILED"). */
  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        reject(new ClientError("RECORD_FAILED"));
        return;
      }

      mediaRecorder.onstop = () => {
        const type =
          mediaRecorder.mimeType || mimeTypeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        mediaRecorderRef.current = null;

        releaseResources();

        setState((prev) => ({
          ...prev,
          isRecording: false,
          duration: 0,
          audioLevel: 0,
        }));
        resolve(blob);
      };

      mediaRecorder.onerror = () => {
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        releaseResources();
        setState((prev) => ({
          ...prev,
          isRecording: false,
          duration: 0,
          audioLevel: 0,
        }));
        reject(new ClientError("RECORD_FAILED"));
      };

      mediaRecorder.stop();
    });
  }, [releaseResources]);

  /** Abort the current recording and discard whatever was captured. */
  const cancelRecording = useCallback(() => {
    captureGeneration.current++;
    const mediaRecorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.onstop = null;
      mediaRecorder.ondataavailable = null;
      try {
        mediaRecorder.stop();
      } catch {
        // Already stopped
      }
    }
    chunksRef.current = [];
    releaseResources();
    setState((prev) => ({
      ...prev,
      isRecording: false,
      duration: 0,
      audioLevel: 0,
    }));
  }, [releaseResources]);

  // Stop any in-progress recording and release the mic on unmount
  useEffect(() => cancelRecording, [cancelRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
