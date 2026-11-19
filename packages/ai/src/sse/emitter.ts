import type { InterviewEvent } from "@interviewiq/types";

declare global {
  // eslint-disable-next-line no-var
  var __sseEmitter: SSEEmitter | undefined;
}

interface Connection {
  controller: ReadableStreamDefaultController;
  heartbeat: ReturnType<typeof setInterval>;
}

const HEARTBEAT_MS = 15_000;
const encoder = new TextEncoder();

/**
 * Registry of live SSE connections, one per session.
 *
 * Process-local: fine for a single long-lived Node server, not for
 * multi-instance serverless (see "Process model and deployment" in ARCHITECTURE.md).
 */
export class SSEEmitter {
  private connections: Map<string, Connection> = new Map();

  register(sessionId: string, controller: ReadableStreamDefaultController): void {
    // Replace any previous connection for this session (refresh / second tab)
    const existing = this.connections.get(sessionId);
    if (existing) this.teardown(sessionId, existing);

    const heartbeat = setInterval(() => {
      try {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      } catch {
        // Stream closed — drop the connection
        const current = this.connections.get(sessionId);
        if (current?.controller === controller) {
          this.teardown(sessionId, current);
        }
      }
    }, HEARTBEAT_MS);

    this.connections.set(sessionId, { controller, heartbeat });
  }

  /**
   * Unregister a connection. Only removes it if `controller` is still the
   * active one, so a stale connection's cancel() can't drop a newer one.
   */
  unregister(sessionId: string, controller?: ReadableStreamDefaultController): void {
    const current = this.connections.get(sessionId);
    if (!current) return;
    if (controller && current.controller !== controller) return;
    clearInterval(current.heartbeat);
    this.connections.delete(sessionId);
  }

  emit(sessionId: string, event: InterviewEvent): void {
    const connection = this.connections.get(sessionId);
    if (!connection) return;

    try {
      connection.controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
      );
    } catch {
      // Connection closed — clean up
      this.teardown(sessionId, connection);
    }
  }

  private teardown(sessionId: string, connection: Connection): void {
    clearInterval(connection.heartbeat);
    if (this.connections.get(sessionId) === connection) {
      this.connections.delete(sessionId);
    }
    try {
      connection.controller.close();
    } catch {
      // Already closed
    }
  }
}

// Singleton via globalThis to survive Next.js hot reload
export const sseEmitter: SSEEmitter = globalThis.__sseEmitter ?? new SSEEmitter();
globalThis.__sseEmitter = sseEmitter;
