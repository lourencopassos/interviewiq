import type { AvatarFailureCode } from "@interviewiq/types";
import { isMockMode, delay } from "../mock";

const DID_API_BASE = "https://api.d-id.com";

/** Microsoft neural voices D-ID supports, per interview language. */
const DID_VOICE_BY_LANGUAGE: Record<string, string> = {
  EN: "en-US-JennyNeural",
  PT_BR: "pt-BR-FranciscaNeural",
  ES: "es-MX-DaliaNeural",
};

/** After the SDP answer arrives, give ICE this long to connect before flushing queued text. */
const HANDSHAKE_SETTLE_MS = 1_500;

/**
 * `message` carries provider detail for server logs only; clients get `code`
 * (mapped to fixed copy) via the `avatar_stream_failed` event.
 */
export class AvatarStreamError extends Error {
  constructor(
    message: string,
    public code: AvatarFailureCode = "AVATAR_UNAVAILABLE",
  ) {
    super(message);
    this.name = "AvatarStreamError";
  }
}

/** Minimal WebRTC types for Node.js context (full types live in the browser). */
interface SDPDescriptionInit {
  type: string;
  sdp?: string;
}

interface ICECandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface StreamSession {
  id: string;
  offer: SDPDescriptionInit;
  iceServers: ICEServer[];
  /** The still image the stream was created from. */
  presenterUrl: string;
}

export class AvatarStream {
  private apiKey: string;
  private presenterUrl: string;
  private voiceId: string;
  private streamId: string | null = null;
  private sessionId: string | null = null;
  private handshakeComplete = false;
  private pendingTexts: string[] = [];
  private flushing: Promise<void> | null = null;
  /** Whether the current stream is the mock-mode stand-in rather than a real D-ID stream. */
  private createdInMock = false;

  constructor(language: string = "EN") {
    this.apiKey = process.env.DID_API_KEY || "";
    this.presenterUrl =
      process.env.DID_PRESENTER_URL ||
      "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg";
    this.voiceId = DID_VOICE_BY_LANGUAGE[language] ?? DID_VOICE_BY_LANGUAGE.EN;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(this.apiKey).toString("base64")}`;
  }

  /**
   * Create a new D-ID stream session.
   * Returns the WebRTC SDP offer and ICE servers for the frontend to establish a peer connection.
   */
  async createStream(presenterImageUrl?: string): Promise<StreamSession> {
    if (isMockMode()) {
      await delay(100);
      this.createdInMock = true;
      this.streamId = "mock-stream";
      this.handshakeComplete = true;
      return {
        id: "mock-stream",
        offer: { type: "offer", sdp: "mock-sdp" },
        iceServers: [],
        presenterUrl: presenterImageUrl || this.presenterUrl,
      };
    }

    if (!this.apiKey) {
      throw new AvatarStreamError("DID_API_KEY not configured");
    }

    const response = await fetch(`${DID_API_BASE}/talks/streams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({ source_url: presenterImageUrl || this.presenterUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const quota = response.status === 403 && /max (user )?sessions/i.test(errorText);
      throw new AvatarStreamError(
        quota
          ? "D-ID concurrent stream limit reached; earlier streams must expire before a new one can start."
          : `D-ID create stream failed (${response.status}): ${errorText}`,
        quota ? "AVATAR_QUOTA" : response.status === 402 ? "AVATAR_NO_CREDITS" : "AVATAR_UNAVAILABLE",
      );
    }

    const data = await response.json();
    this.createdInMock = false;
    this.streamId = data.id;
    this.sessionId = data.session_id;

    return {
      id: data.id,
      offer: data.offer,
      iceServers: data.ice_servers,
      presenterUrl: presenterImageUrl || this.presenterUrl,
    };
  }

  /**
   * Send the frontend's SDP answer back to D-ID to complete the WebRTC handshake.
   * Any text queued before this point is flushed once the connection has had a
   * moment to settle.
   */
  async sendSdpAnswer(sdpAnswer: SDPDescriptionInit): Promise<void> {
    if (this.isMockStream || !this.streamId) return;

    const response = await fetch(
      `${DID_API_BASE}/talks/streams/${this.streamId}/sdp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader,
        },
        body: JSON.stringify({ answer: sdpAnswer, session_id: this.sessionId }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new AvatarStreamError(
        `D-ID SDP answer failed (${response.status}): ${errorText}`,
      );
    }

    this.handshakeComplete = true;
    void this.flushPending();
  }

  /** Send an ICE candidate to D-ID for the WebRTC connection. */
  async sendIceCandidate(candidate: ICECandidateInit): Promise<void> {
    if (this.isMockStream || !this.streamId) return;

    const response = await fetch(
      `${DID_API_BASE}/talks/streams/${this.streamId}/ice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader,
        },
        body: JSON.stringify({
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
          session_id: this.sessionId,
        }),
      },
    );

    if (!response.ok) {
      console.warn("D-ID ICE candidate exchange failed:", response.status);
    }
  }

  /**
   * Send text to the stream — D-ID synthesises speech and lip-syncs the avatar.
   * Before the WebRTC handshake completes the text is queued, so the first
   * question is not lost while the browser is still negotiating.
   */
  async sendText(text: string): Promise<void> {
    if (this.isMockStream) {
      await delay(50);
      return;
    }

    if (!this.streamId) {
      throw new AvatarStreamError("No active stream — call createStream first");
    }

    if (!this.handshakeComplete) {
      this.pendingTexts.push(text);
      return;
    }

    await this.postText(text);
  }

  private async flushPending(): Promise<void> {
    if (this.flushing) return this.flushing;
    this.flushing = (async () => {
      await delay(HANDSHAKE_SETTLE_MS);
      while (this.pendingTexts.length > 0 && this.streamId) {
        const text = this.pendingTexts.shift()!;
        try {
          await this.postText(text);
        } catch (error) {
          console.warn("D-ID queued text failed:", error);
        }
      }
      this.flushing = null;
    })();
    return this.flushing;
  }

  private async postText(text: string): Promise<void> {
    const response = await fetch(`${DID_API_BASE}/talks/streams/${this.streamId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        script: {
          type: "text",
          input: text,
          provider: { type: "microsoft", voice_id: this.voiceId },
        },
        session_id: this.sessionId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AvatarStreamError(
        response.status === 402
          ? "D-ID account has no credits left; the avatar can't speak (video falls back to the still image)."
          : `D-ID stream text injection failed (${response.status}): ${errorText}`,
        response.status === 402 ? "AVATAR_NO_CREDITS" : "AVATAR_UNAVAILABLE",
      );
    }
  }

  /** Close the stream session and tear down the WebRTC connection. */
  async destroy(): Promise<void> {
    this.pendingTexts = [];
    if (this.createdInMock || !this.streamId) {
      this.streamId = null;
      this.sessionId = null;
      this.createdInMock = false;
      return;
    }

    try {
      await fetch(`${DID_API_BASE}/talks/streams/${this.streamId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.authHeader,
        },
        body: JSON.stringify({ session_id: this.sessionId }),
      });
    } catch (error) {
      console.warn("D-ID stream destroy failed:", error);
    } finally {
      this.streamId = null;
      this.sessionId = null;
      this.handshakeComplete = false;
    }
  }

  /**
   * True when this request runs in mock mode or the stream itself is the mock
   * stand-in. Either way nothing may reach D-ID: a mock stream id is fake, and
   * a mock-mode request must not spend credits on a real stream.
   */
  private get isMockStream(): boolean {
    return this.createdInMock || isMockMode();
  }

  /** Whether the current stream was created in mock mode (see InterviewOrchestrator). */
  get mock(): boolean {
    return this.createdInMock;
  }

  get isActive(): boolean {
    return this.streamId !== null;
  }

  get currentStreamId(): string | null {
    return this.streamId;
  }
}
