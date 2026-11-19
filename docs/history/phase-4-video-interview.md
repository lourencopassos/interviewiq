# Phase 4 — Real-Time Video Interview (D-ID Streams API)

## Goals

24. Google Meet-like video interview with AI avatar interviewer using **D-ID Streams API (WebRTC)**
25. User webcam self-view (live only, no recording)
26. Avatar lip-syncs in real-time as TTS audio plays (~500ms latency)
27. Graceful degradation: falls back to audio-only per-question when D-ID fails
28. Mock mode: static avatar with CSS animations, no D-ID API calls
29. Video mode toggle in setup page — audio-only remains the default

---

## Architecture

### Why D-ID Streams Over Talks

The Talks API (batch) generates pre-rendered MP4 clips: send audio + face image → wait 3-8s → get a video URL. This creates a noticeable delay between questions and doesn't feel like a real conversation.

The **Streams API** uses WebRTC to stream a live avatar that lip-syncs in real-time:
- **~500ms latency** vs 3-8s for Talks
- **Persistent connection**: Avatar stays "alive" the entire interview, no clip gaps
- **~$0.03/min** vs ~$0.10/clip — cheaper for long interviews
- **No pre-rendering needed**: Eliminates AvatarCache entirely. TTS audio pipes directly into the stream.

### Pipeline (Streams API)

```
Interview starts
  └─ Open D-ID Stream session → receive WebRTC SDP offer
  └─ Frontend establishes WebRTC peer connection → avatar visible immediately

User finishes answering Q(N)
  └─ Server evaluates answer, selects Q(N+1)
  └─ TTS generates audio for Q(N+1) → audio buffer ready
  └─ Server sends audio to D-ID Stream → avatar lip-syncs in real-time (~500ms)
  └─ Frontend plays TTS audio via existing <audio> element (sync'd)

Interview ends
  └─ Close D-ID Stream session → WebRTC connection torn down
```

Key difference from Talks API: **no AvatarCache, no `video_ready` event, no pre-rendered video URLs**. The avatar is a live WebRTC video track that the frontend connects to once and keeps open.

### New SSE Events

| Event | Data | Description |
|-------|------|-------------|
| `avatar_stream_ready` | `{ sessionId, streamId, sdpOffer, iceServers }` | WebRTC offer from D-ID — frontend must answer |
| `avatar_stream_audio` | `{ questionId }` | Audio sent to stream, avatar will start speaking |
| `avatar_stream_failed` | `{ reason }` | Stream creation or audio injection failed, use audio-only |

Removes: `video_ready`, `video_fallback` (batch Talks API events)

### New Services

- **AvatarStream** (`packages/ai/src/services/avatar-stream.ts`): D-ID Streams API wrapper — manages stream lifecycle and audio injection

### Removed Services (from Talks API implementation)

- **AvatarPipeline** (`packages/ai/src/services/avatar-pipeline.ts`): DELETE — batch Talks API wrapper no longer needed
- **AvatarCache** (`packages/ai/src/cache/avatar-cache.ts`): DELETE — no pre-rendering with streaming

### Modified Services

- **InterviewOrchestrator**: Manages AvatarStream lifecycle instead of AvatarCache. Opens stream on interview start, sends audio per question, closes on complete.

---

## D-ID Streams API Reference

### Stream Lifecycle

```
1. POST /streams  →  { id, offer (SDP), ice_servers }
   - Creates a stream with a presenter image
   - Returns WebRTC SDP offer + ICE servers

2. POST /streams/{id}/sdp  →  200 OK
   - Client sends back SDP answer from RTCPeerConnection

3. POST /streams/{id}/ice  →  200 OK
   - Exchange ICE candidates (if needed)

4. POST /streams/{id}  →  200 OK
   - Send audio to the stream (avatar lip-syncs in real-time)
   - Body: { script: { type: "audio", audio_url: "data:audio/mpeg;base64,..." } }

5. DELETE /streams/{id}  →  200 OK
   - Tears down the stream and WebRTC connection
```

### Key Headers

```
Authorization: Basic {DID_API_KEY}
Content-Type: application/json
```

---

## Database Changes

No new schema changes needed beyond what Talks API already added:

```prisma
model Session {
  // ... existing fields ...
  videoMode      Boolean        @default(false)
  avatarImageUrl String?
}
```

---

## Backend Implementation

### New: `packages/ai/src/services/avatar-stream.ts`

```typescript
import { isMockMode, delay } from "../mock";

const DID_API_BASE = "https://api.d-id.com";

export class AvatarStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarStreamError";
  }
}

interface StreamSession {
  id: string;
  offer: RTCSessionDescriptionInit;  // SDP offer from D-ID
  iceServers: RTCIceServer[];
}

export class AvatarStream {
  private apiKey: string;
  private presenterUrl: string;
  private streamId: string | null = null;

  constructor() {
    this.apiKey = process.env.DID_API_KEY || "";
    this.presenterUrl =
      process.env.DID_PRESENTER_URL ||
      "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg";
  }

  /**
   * Create a new D-ID stream session.
   * Returns the WebRTC SDP offer and ICE servers for the frontend to establish a peer connection.
   */
  async createStream(presenterImageUrl?: string): Promise<StreamSession> {
    if (isMockMode()) {
      await delay(100);
      this.streamId = "mock-stream";
      return {
        id: "mock-stream",
        offer: { type: "offer", sdp: "mock-sdp" },
        iceServers: [],
      };
    }

    if (!this.apiKey) {
      throw new AvatarStreamError("DID_API_KEY not configured");
    }

    const presenterUrl = presenterImageUrl || this.presenterUrl;

    const response = await fetch(`${DID_API_BASE}/streams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${this.apiKey}`,
      },
      body: JSON.stringify({
        source_url: presenterUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AvatarStreamError(
        `D-ID create stream failed (${response.status}): ${errorText}`,
      );
    }

    const data = await response.json();
    this.streamId = data.id;

    return {
      id: data.id,
      offer: data.offer,
      iceServers: data.ice_servers,
    };
  }

  /**
   * Send the frontend's SDP answer back to D-ID to complete the WebRTC handshake.
   */
  async sendSdpAnswer(sdpAnswer: RTCSessionDescriptionInit): Promise<void> {
    if (isMockMode() || !this.streamId) return;

    const response = await fetch(
      `${DID_API_BASE}/streams/${this.streamId}/sdp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this.apiKey}`,
        },
        body: JSON.stringify({
          answer: sdpAnswer,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new AvatarStreamError(
        `D-ID SDP answer failed (${response.status}): ${errorText}`,
      );
    }
  }

  /**
   * Send an ICE candidate to D-ID for the WebRTC connection.
   */
  async sendIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (isMockMode() || !this.streamId) return;

    const response = await fetch(
      `${DID_API_BASE}/streams/${this.streamId}/ice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this.apiKey}`,
        },
        body: JSON.stringify({
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        }),
      },
    );

    if (!response.ok) {
      console.warn("D-ID ICE candidate exchange failed:", response.status);
    }
  }

  /**
   * Send TTS audio to the stream — avatar will lip-sync in real-time.
   * This is the core method called each time a question is asked.
   */
  async sendAudio(audioBuffer: Buffer): Promise<void> {
    if (isMockMode()) {
      await delay(50);
      console.log("[MOCK] avatar stream — simulated audio injection");
      return;
    }

    if (!this.streamId) {
      throw new AvatarStreamError("No active stream — call createStream first");
    }

    const audioBase64 = audioBuffer.toString("base64");

    const response = await fetch(
      `${DID_API_BASE}/streams/${this.streamId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this.apiKey}`,
        },
        body: JSON.stringify({
          script: {
            type: "audio",
            audio_url: `data:audio/mpeg;base64,${audioBase64}`,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new AvatarStreamError(
        `D-ID stream audio injection failed (${response.status}): ${errorText}`,
      );
    }
  }

  /**
   * Close the stream session and tear down the WebRTC connection.
   */
  async destroy(): Promise<void> {
    if (isMockMode() || !this.streamId) return;

    try {
      await fetch(`${DID_API_BASE}/streams/${this.streamId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${this.apiKey}`,
        },
      });
    } catch (error) {
      console.warn("D-ID stream destroy failed:", error);
    } finally {
      this.streamId = null;
    }
  }

  get isActive(): boolean {
    return this.streamId !== null;
  }

  get currentStreamId(): string | null {
    return this.streamId;
  }
}
```

### Modified: `packages/ai/src/services/interview-orchestrator.ts`

**Replace** `AvatarCache` and `AvatarPipeline` imports with `AvatarStream`:

```typescript
import { AvatarStream } from "./avatar-stream";
```

**Replace** fields:

```typescript
// REMOVE:
private avatarCache: AvatarCache | null = null;

// ADD:
private avatarStream: AvatarStream | null = null;
```

**Replace** `emitAudioAndVideo()` with `emitAudioAndStream()`:

```typescript
/**
 * Emit audio_ready and, if video mode, send audio to D-ID stream for real-time lip-sync.
 */
private async emitAudioAndStream(
  questionId: string,
  audioUrl: string,
  audioBuffer: Buffer | null,
): Promise<void> {
  this.emit({ type: "audio_ready", data: { questionId, audioUrl } });

  if (this.videoMode && this.avatarStream?.isActive && audioBuffer) {
    try {
      await this.avatarStream.sendAudio(audioBuffer);
      this.emit({
        type: "avatar_stream_audio",
        data: { questionId },
      });
    } catch (error) {
      console.warn(`Avatar stream audio failed for ${questionId}:`, error);
      this.emit({
        type: "avatar_stream_failed",
        data: {
          reason: error instanceof Error ? error.message : "Stream audio failed",
        },
      });
    }
  }
}
```

**Replace** `prefetchNext()` — no more avatar chaining, just TTS prefetch:

```typescript
/**
 * Pre-fetch TTS for the next question. No avatar pre-rendering needed with streaming.
 */
private prefetchNext(questionIndex: number, language: string): void {
  this.ttsCache.prefetch(questionIndex, this.questions, language);
}
```

**Modify** `startInterview()` — create D-ID stream session:

```typescript
// In startInterview(), after reading session:
this.videoMode = session.videoMode;
this.presenterImageUrl = session.avatarImageUrl ?? undefined;

if (this.videoMode) {
  try {
    this.avatarStream = new AvatarStream();
    const streamSession = await this.avatarStream.createStream(this.presenterImageUrl);
    this.emit({
      type: "avatar_stream_ready",
      data: {
        sessionId: this.sessionId,
        streamId: streamSession.id,
        sdpOffer: streamSession.offer,
        iceServers: streamSession.iceServers,
      },
    });
  } catch (error) {
    console.warn("Avatar stream creation failed, falling back to audio-only:", error);
    this.avatarStream = null;
    this.emit({
      type: "avatar_stream_failed",
      data: {
        reason: error instanceof Error ? error.message : "Stream creation failed",
      },
    });
  }
}
```

**Replace** all `emitAudioAndVideo(...)` calls with `emitAudioAndStream(...)`.

**Replace** all `avatarCache?.invalidate(...)` calls — remove them (no cache to invalidate).

**Modify** `generateReport()` cleanup:

```typescript
// REMOVE:
this.avatarCache?.clear();

// ADD:
await this.avatarStream?.destroy();
```

### New API Routes

#### `POST /api/interview/[id]/avatar-sdp` — WebRTC SDP Answer Relay

The frontend establishes its `RTCPeerConnection`, generates an SDP answer, and sends it to the server. The server relays it to D-ID.

```typescript
// apps/web/app/api/interview/[id]/avatar-sdp/route.ts
import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { sdpAnswer } = await request.json();
  const orchestrator = getOrCreateOrchestrator(params.id);

  // Orchestrator delegates to its AvatarStream instance
  await orchestrator.handleSdpAnswer(sdpAnswer);

  return Response.json({ ok: true });
}
```

#### `POST /api/interview/[id]/avatar-ice` — ICE Candidate Relay

```typescript
// apps/web/app/api/interview/[id]/avatar-ice/route.ts
import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { candidate } = await request.json();
  const orchestrator = getOrCreateOrchestrator(params.id);

  await orchestrator.handleIceCandidate(candidate);

  return Response.json({ ok: true });
}
```

**Add to InterviewOrchestrator** (public methods for WebRTC signaling):

```typescript
async handleSdpAnswer(sdpAnswer: RTCSessionDescriptionInit): Promise<void> {
  if (!this.avatarStream) throw new Error("No active avatar stream");
  await this.avatarStream.sendSdpAnswer(sdpAnswer);
}

async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
  if (!this.avatarStream) throw new Error("No active avatar stream");
  await this.avatarStream.sendIceCandidate(candidate);
}
```

### Modified: `packages/ai/src/cache/tts-cache.ts`

**Remove** `prefetchWithCallback` and `getOrGenerateWithBuffer` methods — the avatar chaining callback is no longer needed. Revert to the original `prefetch` and `getOrGenerate` API.

However, keep `getOrGenerateWithBuffer` as it's still useful for `emitAudioAndStream` (we need the raw buffer to send to D-ID Stream). If you want to simplify, the orchestrator can call `getOrGenerate` for the URL and then read the buffer from the blob store.

**Decision**: Keep `getOrGenerateWithBuffer` (it's useful). Remove `prefetchWithCallback` (no avatar callback chain needed).

### Modified: `packages/ai/src/index.ts`

```typescript
// REMOVE:
export { AvatarPipeline, AvatarPipelineError } from "./services/avatar-pipeline";
export { AvatarCache, getAvatarCache } from "./cache/avatar-cache";

// ADD:
export { AvatarStream, AvatarStreamError } from "./services/avatar-stream";
```

### Modified: `packages/types/src/events.ts`

```typescript
// REMOVE:
| { type: "video_ready"; data: { questionId: string; videoUrl: string } }
| { type: "video_fallback"; data: { questionId: string; reason: string } }

// ADD:
| {
    type: "avatar_stream_ready";
    data: {
      sessionId: string;
      streamId: string;
      sdpOffer: RTCSessionDescriptionInit;
      iceServers: RTCIceServer[];
    };
  }
| { type: "avatar_stream_audio"; data: { questionId: string } }
| { type: "avatar_stream_failed"; data: { reason: string } }
```

---

## Frontend Implementation

### New Hook: `apps/web/hooks/useAvatarStream.ts`

Manages the WebRTC peer connection to D-ID's streaming avatar.

```typescript
"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface AvatarStreamState {
  /** Remote video MediaStream from D-ID (avatar) */
  remoteStream: MediaStream | null;
  /** Whether the WebRTC connection is established */
  isConnected: boolean;
  /** Whether the avatar is currently speaking (audio injected) */
  isSpeaking: boolean;
  /** Error message if connection failed */
  error: string | null;
}

export function useAvatarStream(sessionId: string) {
  const [state, setState] = useState<AvatarStreamState>({
    remoteStream: null,
    isConnected: false,
    isSpeaking: false,
    error: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const streamIdRef = useRef<string | null>(null);

  /**
   * Called when the SSE `avatar_stream_ready` event arrives.
   * Sets up the WebRTC peer connection, sends SDP answer back to server.
   */
  const connect = useCallback(
    async (data: {
      streamId: string;
      sdpOffer: RTCSessionDescriptionInit;
      iceServers: RTCIceServer[];
    }) => {
      try {
        streamIdRef.current = data.streamId;

        // Create peer connection with D-ID's ICE servers
        const pc = new RTCPeerConnection({
          iceServers: data.iceServers,
        });
        peerConnectionRef.current = pc;

        // Handle incoming video track from D-ID (the avatar)
        pc.ontrack = (event) => {
          if (event.streams[0]) {
            setState((prev) => ({
              ...prev,
              remoteStream: event.streams[0],
              isConnected: true,
            }));
          }
        };

        // Relay ICE candidates to server → D-ID
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await fetch(`/api/interview/${sessionId}/avatar-ice`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidate: event.candidate }),
              });
            } catch {
              console.warn("ICE candidate relay failed");
            }
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            setState((prev) => ({
              ...prev,
              isConnected: false,
              error: `WebRTC connection ${pc.connectionState}`,
            }));
          }
        };

        // Set remote description (D-ID's offer)
        await pc.setRemoteDescription(data.sdpOffer);

        // Create and set local answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send SDP answer to server → D-ID
        await fetch(`/api/interview/${sessionId}/avatar-sdp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sdpAnswer: answer }),
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "WebRTC setup failed",
        }));
      }
    },
    [sessionId],
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

  /**
   * Tear down the peer connection.
   */
  const disconnect = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    streamIdRef.current = null;
    setState({
      remoteStream: null,
      isConnected: false,
      isSpeaking: false,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerConnectionRef.current?.close();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    onAudioInjected,
    onAudioEnded,
    onStreamFailed,
  };
}
```

### Modified: `apps/web/hooks/useInterviewStream.ts`

**Replace** video events in state and reducer:

```typescript
// REMOVE from InterviewState:
videoUrl: string | null;
videoFallback: boolean;

// ADD to InterviewState:
avatarStreamData: {
  streamId: string;
  sdpOffer: RTCSessionDescriptionInit;
  iceServers: RTCIceServer[];
} | null;
avatarSpeaking: boolean;
avatarFailed: boolean;
```

**Replace** action types:

```typescript
// REMOVE:
| { type: "video_ready"; payload: { questionId: string; videoUrl: string } }
| { type: "video_fallback"; payload: { questionId: string; reason: string } }

// ADD:
| {
    type: "avatar_stream_ready";
    payload: {
      sessionId: string;
      streamId: string;
      sdpOffer: RTCSessionDescriptionInit;
      iceServers: RTCIceServer[];
    };
  }
| { type: "avatar_stream_audio"; payload: { questionId: string } }
| { type: "avatar_stream_failed"; payload: { reason: string } }
```

**Replace** reducer cases:

```typescript
// REMOVE:
case "video_ready":
  return { ...state, videoUrl: action.payload.videoUrl };
case "video_fallback":
  return { ...state, videoUrl: null, videoFallback: true };

// ADD:
case "avatar_stream_ready":
  return {
    ...state,
    avatarStreamData: {
      streamId: action.payload.streamId,
      sdpOffer: action.payload.sdpOffer,
      iceServers: action.payload.iceServers,
    },
  };
case "avatar_stream_audio":
  return { ...state, avatarSpeaking: true };
case "avatar_stream_failed":
  return { ...state, avatarFailed: true };
```

**Update** `question_ready` reset:

```typescript
case "question_ready":
  return {
    ...state,
    currentQuestion: action.payload,
    transcript: null,
    evaluation: null,
    transitionMessage: null,
    audioUrl: null,
    avatarSpeaking: false,
    // Note: Do NOT reset avatarStreamData or avatarFailed here —
    // the stream persists across questions
  };
```

### Modified: `apps/web/components/interview/avatar-panel.tsx`

**Replace** the batch video `<video src={videoUrl}>` with a WebRTC `<video srcObject={remoteStream}>`:

```typescript
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
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
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
          muted // Audio plays through useAudioPlayback — avatar video is visual only
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
```

### Modified: `apps/web/components/interview/video-layout.tsx`

Update props to pass `remoteStream` + `isStreamConnected` instead of `videoUrl`:

```typescript
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
```

Update `<AvatarPanel>` usage:

```typescript
<AvatarPanel
  remoteStream={remoteStream}
  isStreamConnected={isStreamConnected}
  isPlaying={isPlaying}
  phase={avatarPhase}
  isMockMode={isMockMode}
/>
```

### Modified: `apps/web/app/interview/[id]/page.tsx`

**Add** `useAvatarStream` hook and wire up SSE events:

```typescript
import { useAvatarStream } from "@/hooks/useAvatarStream";

// Inside InterviewPage:
const avatarStream = useAvatarStream(id);

// Connect avatar when stream data arrives via SSE
useEffect(() => {
  if (interview.avatarStreamData && !avatarStream.isConnected && !avatarStream.error) {
    avatarStream.connect(interview.avatarStreamData);
  }
}, [interview.avatarStreamData]);

// Handle avatar stream audio injection event
useEffect(() => {
  if (interview.avatarSpeaking) {
    avatarStream.onAudioInjected();
  }
}, [interview.avatarSpeaking]);

// Handle avatar stream failure
useEffect(() => {
  if (interview.avatarFailed) {
    avatarStream.onStreamFailed("Avatar stream failed");
  }
}, [interview.avatarFailed]);

// Sync avatar speaking state with audio playback
useEffect(() => {
  if (!playback.isPlaying && avatarStream.isSpeaking) {
    avatarStream.onAudioEnded();
  }
}, [playback.isPlaying]);

// Cleanup avatar stream on unmount
useEffect(() => {
  return () => {
    avatarStream.disconnect();
  };
}, []);
```

**Update** `avatarPhase` derivation:

```typescript
const avatarPhase = (() => {
  if (avatarStream.error || interview.avatarFailed) return "fallback" as const;
  if (phase === "speaking") return "speaking" as const;
  if (phase === "recording") return "listening" as const;
  if (phase === "processing") return "thinking" as const;
  if (phase === "loading") return "loading" as const;
  return "listening" as const;
})();
```

**Update** VideoLayout render:

```typescript
if (isVideoMode) {
  return (
    <VideoLayout
      remoteStream={avatarStream.remoteStream}
      isStreamConnected={avatarStream.isConnected}
      isPlaying={playback.isPlaying}
      avatarPhase={avatarPhase}
      isMockMode={isMock}
      webcamStream={webcam.stream}
      webcamActive={webcam.isActive}
      onWebcamToggle={handleWebcamToggle}
    >
      {interviewControls}
    </VideoLayout>
  );
}
```

---

## Files to Delete

- `packages/ai/src/services/avatar-pipeline.ts` — replaced by `avatar-stream.ts`
- `packages/ai/src/cache/avatar-cache.ts` — no cache needed with streaming

---

## Environment Variables

Same as before (no changes):

```env
DID_API_KEY=               # D-ID API key (now used for Streams API)
DID_PRESENTER_URL=         # Default presenter image URL (optional)
```

---

## Mock Mode

- `AvatarStream.createStream()` returns a mock stream session instantly (no D-ID calls)
- `AvatarStream.sendAudio()` logs and returns immediately
- `AvatarPanel` shows static avatar image with CSS speaking/idle animations
- `useAvatarStream.connect()` detects mock SDP and skips RTCPeerConnection setup
- Consistent with existing cookie-based mock mode toggle

---

## Implementation Checklist

### Backend
- [ ] Create `AvatarStream` service (`packages/ai/src/services/avatar-stream.ts`)
- [ ] Delete `AvatarPipeline` (`packages/ai/src/services/avatar-pipeline.ts`)
- [ ] Delete `AvatarCache` (`packages/ai/src/cache/avatar-cache.ts`)
- [ ] Remove `prefetchWithCallback` from `TTSCache` (keep `getOrGenerateWithBuffer`)
- [ ] Modify `InterviewOrchestrator`: replace AvatarCache with AvatarStream lifecycle
- [ ] Add `handleSdpAnswer` and `handleIceCandidate` public methods to orchestrator
- [ ] Create `/api/interview/[id]/avatar-sdp` route
- [ ] Create `/api/interview/[id]/avatar-ice` route
- [ ] Update `packages/ai/src/index.ts` exports

### Types
- [ ] Replace `video_ready` / `video_fallback` with `avatar_stream_ready` / `avatar_stream_audio` / `avatar_stream_failed` in `InterviewEvent`

### Frontend
- [ ] Create `useAvatarStream` hook (`apps/web/hooks/useAvatarStream.ts`)
- [ ] Update `useInterviewStream` — replace video state/actions with avatar stream events
- [ ] Update `AvatarPanel` — `<video srcObject={remoteStream}>` instead of `<video src={videoUrl}>`
- [ ] Update `VideoLayout` props
- [ ] Update interview page — wire `useAvatarStream` to SSE events and playback
- [ ] Handle mock mode in `useAvatarStream` (skip RTCPeerConnection for mock SDP)

### Testing
- [ ] Test real-time avatar with D-ID API key — verify lip-sync latency
- [ ] Test mock mode — static avatar with CSS animations, no D-ID calls
- [ ] Test graceful degradation when D-ID stream fails
- [ ] Test webcam permission denial fallback
- [ ] Test audio-only mode unchanged
- [ ] Test WebRTC ICE candidate exchange
- [ ] Test stream cleanup on interview completion
- [ ] Test browser tab close / page refresh (stream teardown)
- [ ] Test responsive layout on mobile

---

## Key Differences from Talks API (Previous Implementation)

| Aspect | Talks API (batch) | Streams API (real-time) |
|--------|-------------------|------------------------|
| Latency | 3-8s per clip | ~500ms continuous |
| Connection | HTTP request per question | Persistent WebRTC session |
| Avatar behavior | Pre-rendered MP4 clips with gaps | Live avatar, always visible |
| Caching | AvatarCache pre-fetches next clip | No cache needed — audio piped live |
| Frontend | `<video src={url}>` per question | `<video srcObject={stream}>` once |
| Cost | ~$0.10/clip | ~$0.03/min |
| SSE events | `video_ready` / `video_fallback` | `avatar_stream_ready` / `avatar_stream_audio` / `avatar_stream_failed` |
| Services | AvatarPipeline + AvatarCache | AvatarStream only |
| Signaling | None | WebRTC SDP + ICE via server relay |

---

## Implementation Sequence

1. Delete `avatar-pipeline.ts` and `avatar-cache.ts`
2. Create `avatar-stream.ts` (D-ID Streams API wrapper)
3. Update types (`InterviewEvent` — swap video events for stream events)
4. Update `index.ts` exports
5. Modify `InterviewOrchestrator` — stream lifecycle + signaling methods
6. Remove `prefetchWithCallback` from `TTSCache`
7. Create `/api/interview/[id]/avatar-sdp` and `avatar-ice` routes
8. Create `useAvatarStream` hook
9. Update `useInterviewStream` reducer (stream events)
10. Update `AvatarPanel` (WebRTC video)
11. Update `VideoLayout` props
12. Update interview page (wire hooks together)
13. Mock mode polish
14. End-to-end testing
