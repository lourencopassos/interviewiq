import { randomUUID } from "crypto";
import { AudioPipeline } from "../services/audio-pipeline";

declare global {
  var __ttsCache: TTSCache | undefined;
}

export interface CachedAudio {
  buffer: Buffer;
  contentType: string;
}

interface StoredBlob extends CachedAudio {
  sessionId: string;
  createdAt: number;
}

interface PrefetchedAudio extends CachedAudio {
  sessionId: string;
  createdAt: number;
  /** In-flight synthesis, so a cache hit can await an ongoing prefetch instead of re-synthesising. */
  pending?: Promise<CachedAudio>;
}

/** Questions to pre-fetch / served blobs expire after this long. */
const BLOB_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

/** Detect content type from the bytes — mock mode produces WAV, ElevenLabs produces MP3. */
function detectContentType(buffer: Buffer): string {
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "RIFF") {
    return "audio/wav";
  }
  return "audio/mpeg";
}

/**
 * In-memory TTS cache.
 *
 * - `questionCache` holds pre-fetched audio keyed by the DB question id (globally unique).
 * - `blobStore` holds audio that has been handed to the client as `/api/audio/[blobId]`.
 * - Both are scoped per session so finishing one interview never evicts another's audio.
 *
 * This lives in process memory: it is correct for a single long-lived Node server
 * and NOT for multi-instance serverless deployments (see "Process model and deployment" in ARCHITECTURE.md).
 */
export class TTSCache {
  private questionCache: Map<string, PrefetchedAudio> = new Map();
  private blobStore: Map<string, StoredBlob> = new Map();
  private audioPipeline: AudioPipeline;
  private lastSweep = Date.now();

  constructor(audioPipeline?: AudioPipeline) {
    this.audioPipeline = audioPipeline ?? new AudioPipeline();
  }

  /**
   * Pre-fetch TTS for a question (fire-and-forget).
   * Called in the background while the user answers the current question.
   */
  prefetch(
    sessionId: string,
    question: { id: string; text: string } | undefined,
    language: string,
  ): void {
    if (!question) return;
    if (this.questionCache.has(question.id)) return;

    const pending = this.audioPipeline
      .synthesize(question.text, language)
      .then((buffer) => ({ buffer, contentType: detectContentType(buffer) }));

    const entry: PrefetchedAudio = {
      sessionId,
      createdAt: Date.now(),
      buffer: Buffer.alloc(0),
      contentType: "audio/mpeg",
      pending,
    };
    this.questionCache.set(question.id, entry);

    pending
      .then((audio) => {
        const current = this.questionCache.get(question.id);
        if (current === entry) {
          entry.buffer = audio.buffer;
          entry.contentType = audio.contentType;
          entry.pending = undefined;
        }
      })
      .catch((error) => {
        console.warn(`TTS prefetch failed for question ${question.id}:`, error);
        if (this.questionCache.get(question.id) === entry) {
          this.questionCache.delete(question.id);
        }
      });
  }

  /**
   * Get pre-fetched audio or generate on demand. Returns the URL the client can play.
   * Pass `questionId` to consume a prefetched entry; omit it for ad-hoc text
   * (follow-ups, transitions, closing).
   */
  async getOrGenerate(
    sessionId: string,
    text: string,
    language: string,
    questionId?: string,
  ): Promise<string> {
    const audio = await this.resolve(text, language, questionId);
    const blobId = this.store(sessionId, audio);
    return `/api/audio/${blobId}`;
  }

  private async resolve(
    text: string,
    language: string,
    questionId?: string,
  ): Promise<CachedAudio> {
    if (questionId) {
      const cached = this.questionCache.get(questionId);
      if (cached) {
        this.questionCache.delete(questionId);
        try {
          if (cached.pending) return await cached.pending;
          return { buffer: cached.buffer, contentType: cached.contentType };
        } catch {
          // Prefetch failed — fall through to on-demand synthesis
        }
      }
    }

    const buffer = await this.audioPipeline.synthesize(text, language);
    return { buffer, contentType: detectContentType(buffer) };
  }

  /** Drop pre-fetched audio (e.g. when a follow-up is inserted before the next scheduled question). */
  invalidate(questionId: string): void {
    this.questionCache.delete(questionId);
  }

  /** Store a buffer and return a blob id for serving. */
  store(sessionId: string, audio: CachedAudio): string {
    this.sweepIfDue();
    const blobId = randomUUID();
    this.blobStore.set(blobId, { ...audio, sessionId, createdAt: Date.now() });
    return blobId;
  }

  /** Retrieve audio by blob id (used by /api/audio/[blobId]). */
  getAudio(blobId: string): CachedAudio | null {
    const entry = this.blobStore.get(blobId);
    if (!entry) return null;
    return { buffer: entry.buffer, contentType: entry.contentType };
  }

  /** Remove everything belonging to one session. */
  clearSession(sessionId: string): void {
    for (const [id, entry] of this.questionCache) {
      if (entry.sessionId === sessionId) this.questionCache.delete(id);
    }
    for (const [id, entry] of this.blobStore) {
      if (entry.sessionId === sessionId) this.blobStore.delete(id);
    }
  }

  /** Lazy TTL eviction — runs at most once per sweep interval. */
  private sweepIfDue(): void {
    const now = Date.now();
    if (now - this.lastSweep < SWEEP_INTERVAL_MS) return;
    this.lastSweep = now;
    for (const [id, entry] of this.blobStore) {
      if (now - entry.createdAt > BLOB_TTL_MS) this.blobStore.delete(id);
    }
    for (const [id, entry] of this.questionCache) {
      if (now - entry.createdAt > BLOB_TTL_MS) this.questionCache.delete(id);
    }
  }
}

// Singleton via globalThis to survive Next.js hot reload
export const ttsCache: TTSCache = globalThis.__ttsCache ?? new TTSCache();
globalThis.__ttsCache = ttsCache;
