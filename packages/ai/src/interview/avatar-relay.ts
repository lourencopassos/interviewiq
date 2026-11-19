import type { Session } from "@interviewiq/db";
import type { InterviewEvent } from "@interviewiq/types";
import { AvatarStream, AvatarStreamError, type ICECandidateInit, type SDPDescriptionInit } from "../services/avatar-stream";
import { isMockMode } from "../mock";
import { events } from "./events";

/** Statuses in which a browser may still negotiate a video stream. */
const OFFERABLE_STATUSES = new Set<Session["status"]>(["SETUP", "BRIEFING", "INTERVIEWING"]);

/**
 * Owns the D-ID stream of one interview: minting offers on demand, relaying
 * the browser's SDP and ICE, and lip-syncing the current line when its audio
 * starts playing. Every failure degrades to audio-only via `avatar_stream_failed`.
 */
export class AvatarRelay {
  private stream: AvatarStream | null = null;
  /** What the avatar should lip-sync the next time the client starts playback. */
  private lastSpoken: { questionId: string; text: string } | null = null;

  constructor(
    private readonly sessionId: string,
    private readonly emit: (event: InterviewEvent) => void,
  ) {}

  get isActive(): boolean {
    return this.stream?.isActive ?? false;
  }

  /** Remember the line just sent as audio, for the next `speakCurrent()`. */
  remember(questionId: string, text: string): void {
    this.lastSpoken = { questionId, text };
  }

  /**
   * Mint a new stream and emit its offer. Called when the browser needs a peer
   * connection (first load, reload, or after a failure), so the account's
   * concurrent-stream quota is only spent on connections that will be
   * negotiated. Returns false for non-video sessions and finished interviews.
   */
  async requestOffer(session: Session): Promise<boolean> {
    if (!session.videoMode || !OFFERABLE_STATUSES.has(session.status)) return false;
    await this.open(session);
    return this.isActive;
  }

  /** Make the avatar say the current line. Returns false when there is nothing to say or no stream. */
  async speakCurrent(loadSession: () => Promise<Session>): Promise<boolean> {
    if (!this.stream?.isActive || !this.lastSpoken) return false;
    const { questionId, text } = this.lastSpoken;
    // A stream minted while mock mode was on must not serve a real request (and
    // vice versa): mint a matching one. The text queues until its handshake.
    if (this.stream.mock !== isMockMode()) {
      await this.open(await loadSession());
      if (!this.stream?.isActive) return false;
    }
    try {
      await this.stream.sendText(text);
      this.emit(events.avatarAudio(questionId));
      return true;
    } catch (error) {
      console.warn(`Avatar stream text failed for ${questionId}:`, error);
      this.emit(events.avatarFailed(failureCode(error)));
      return false;
    }
  }

  /** Best-effort narration (stage transitions); failures are ignored. */
  async say(text: string): Promise<void> {
    if (this.stream?.isActive) await this.stream.sendText(text).catch(() => undefined);
  }

  async relaySdp(answer: SDPDescriptionInit): Promise<boolean> {
    if (!this.stream?.isActive) return false;
    await this.stream.sendSdpAnswer(answer);
    return true;
  }

  async relayIce(candidate: ICECandidateInit): Promise<boolean> {
    if (!this.stream?.isActive) return false;
    await this.stream.sendIceCandidate(candidate);
    return true;
  }

  async destroy(): Promise<void> {
    await this.stream?.destroy().catch(() => undefined);
    this.stream = null;
  }

  /** Offers are single-use, so any previous stream is torn down first. */
  private async open(session: Session): Promise<void> {
    if (!session.videoMode) return;
    try {
      await this.destroy();
      this.stream = new AvatarStream(session.language);
      const created = await this.stream.createStream();
      this.emit(events.avatarReady(this.sessionId, created));
    } catch (error) {
      console.warn("Avatar stream creation failed, falling back to audio-only:", error);
      this.stream = null;
      this.emit(events.avatarFailed(failureCode(error)));
    }
  }
}

function failureCode(error: unknown) {
  return error instanceof AvatarStreamError ? error.code : "AVATAR_UNAVAILABLE";
}
