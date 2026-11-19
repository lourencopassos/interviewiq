"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { clientHeaders } from "@/lib/client-id";

interface AvatarStreamState {
  /** Remote video MediaStream from D-ID (avatar) */
  remoteStream: MediaStream | null;
  /** Whether the WebRTC connection is established */
  isConnected: boolean;
  /** D-ID only sends video frames while the avatar talks; false between talks. */
  hasFrames: boolean;
  /** Whether the avatar is currently speaking (audio injected) */
  isSpeaking: boolean;
  /** Error message if connection failed */
  error: string | null;
}

interface AvatarStreamData {
  streamId: string;
  sdpOffer: RTCSessionDescriptionInit;
  iceServers: RTCIceServer[];
}

/** How long a `disconnected` peer connection may try to recover before we give up. */
const DISCONNECT_GRACE_MS = 5000;

const initialState: AvatarStreamState = {
  remoteStream: null,
  isConnected: false,
  hasFrames: false,
  isSpeaking: false,
  error: null,
};

export function useAvatarStream(sessionId: string) {
  const [state, setState] = useState<AvatarStreamState>(initialState);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDisconnectTimer = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
  }, []);

  /**
   * Tear down the peer connection.
   */
  const disconnect = useCallback(() => {
    clearDisconnectTimer();
    const pc = peerConnectionRef.current;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    }
    peerConnectionRef.current = null;
    streamIdRef.current = null;
    setState(initialState);
  }, [clearDisconnectTimer]);

  /**
   * Called when the SSE `avatar_stream_ready` event arrives.
   * Sets up the WebRTC peer connection, sends SDP answer back to server.
   */
  const connect = useCallback(
    async (data: AvatarStreamData) => {
      try {
        streamIdRef.current = data.streamId;

        // Mock mode — no real WebRTC, AvatarPanel shows CSS avatar
        if (data.sdpOffer.sdp === "mock-sdp") {
          setState((prev) => ({ ...prev, isConnected: false }));
          return;
        }

        // Replace any previous connection and start clean
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        clearDisconnectTimer();
        setState({ ...initialState });

        // Create peer connection with D-ID's ICE servers
        const pc = new RTCPeerConnection({
          iceServers: data.iceServers,
        });
        peerConnectionRef.current = pc;

        // Handle incoming video track from D-ID (the avatar)
        pc.ontrack = (event) => {
          const stream =
            event.streams[0] ?? new MediaStream([event.track]);
          if (event.track.kind === "video") {
            const track = event.track;
            const update = () =>
              setState((prev) => (prev.hasFrames === !track.muted ? prev : { ...prev, hasFrames: !track.muted }));
            track.onunmute = update;
            track.onmute = update;
            track.onended = () => setState((prev) => ({ ...prev, hasFrames: false }));
            update();
          }
          setState((prev) => {
            // If we already have a remote stream, add the new track to it
            if (prev.remoteStream) {
              prev.remoteStream.addTrack(event.track);
              return { ...prev, isConnected: true };
            }
            return { ...prev, remoteStream: stream, isConnected: true };
          });
        };

        // Relay ICE candidates to server → D-ID
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await fetch(`/api/interview/${sessionId}/avatar-ice`, {
                method: "POST",
                headers: clientHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ candidate: event.candidate }),
              });
            } catch {
              console.warn("ICE candidate relay failed");
            }
          }
        };

        pc.onconnectionstatechange = () => {
          // Ignore events from a connection we have already replaced/closed
          if (peerConnectionRef.current !== pc) return;

          switch (pc.connectionState) {
            case "connected":
              clearDisconnectTimer();
              setState((prev) => ({ ...prev, isConnected: true, error: null }));
              break;

            case "disconnected":
              // Transient: ICE may recover on its own. Only fail after a grace period.
              if (!disconnectTimerRef.current) {
                disconnectTimerRef.current = setTimeout(() => {
                  disconnectTimerRef.current = null;
                  if (
                    peerConnectionRef.current === pc &&
                    pc.connectionState === "disconnected"
                  ) {
                    console.warn(
                      "[Avatar] WebRTC stayed disconnected; falling back to audio mode",
                    );
                    setState((prev) => ({
                      ...prev,
                      isConnected: false,
                      error: "WebRTC connection lost",
                    }));
                  }
                }, DISCONNECT_GRACE_MS);
              }
              break;

            case "failed":
            case "closed":
              clearDisconnectTimer();
              console.warn(`[Avatar] WebRTC connection ${pc.connectionState}`);
              setState((prev) => ({
                ...prev,
                isConnected: false,
                error: `WebRTC connection ${pc.connectionState}`,
              }));
              break;

            default:
              break;
          }
        };

        // Set remote description (D-ID's offer)
        await pc.setRemoteDescription(data.sdpOffer);

        // Create and set local answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send SDP answer to server → D-ID
        const res = await fetch(`/api/interview/${sessionId}/avatar-sdp`, {
          method: "POST",
          headers: clientHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ sdpAnswer: answer }),
        });
        if (!res.ok) {
          throw new Error(`Failed to deliver SDP answer (${res.status})`);
        }
      } catch (error) {
        console.error("[Avatar] WebRTC setup failed:", error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "WebRTC setup failed",
        }));
      }
    },
    [sessionId, clearDisconnectTimer],
  );

  /**
   * Called when `avatar_stream_audio` event arrives — avatar is about to speak.
   */
  const onAudioInjected = useCallback(() => {
    setState((prev) => ({ ...prev, isSpeaking: true }));
  }, []);

  /**
   * Called when audio playback ends — avatar stops speaking.
   */
  const onAudioEnded = useCallback(() => {
    setState((prev) => ({ ...prev, isSpeaking: false }));
  }, []);

  /**
   * Called when `avatar_stream_failed` event arrives.
   */
  const onStreamFailed = useCallback((reason: string) => {
    setState((prev) => ({
      ...prev,
      error: reason,
      isConnected: false,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    onAudioInjected,
    onAudioEnded,
    onStreamFailed,
  };
}
