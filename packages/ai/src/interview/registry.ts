import { ttsCache } from "../cache/tts-cache";
import { InterviewOrchestrator } from "./orchestrator";

declare global {
  var __orchestrators: Map<string, InterviewOrchestrator> | undefined;
}

/**
 * One orchestrator per session, kept on globalThis so its locks and video
 * stream survive Next.js hot reloads. Process-local by design (see
 * "Process model and deployment" in ARCHITECTURE.md).
 */
const orchestrators: Map<string, InterviewOrchestrator> = globalThis.__orchestrators ?? new Map();
globalThis.__orchestrators = orchestrators;

/** Drop `orchestrator` from the registry, unless a newer instance already replaced it. */
function retire(sessionId: string, orchestrator: InterviewOrchestrator): void {
  if (orchestrators.get(sessionId) === orchestrator) orchestrators.delete(sessionId);
}

export function getOrCreateOrchestrator(sessionId: string): InterviewOrchestrator {
  let orchestrator = orchestrators.get(sessionId);
  if (!orchestrator) {
    orchestrator = new InterviewOrchestrator(sessionId, {
      onRetire: (instance) => retire(sessionId, instance),
    });
    orchestrators.set(sessionId, orchestrator);
  }
  return orchestrator;
}

/** Tear down and forget a session's orchestrator (session deleted or abandoned). */
export async function destroyOrchestrator(sessionId: string): Promise<void> {
  const orchestrator = orchestrators.get(sessionId);
  if (orchestrator) {
    await orchestrator.destroy();
  } else {
    ttsCache.clearSession(sessionId);
  }
}
