import { NextResponse } from "next/server";
import { prisma } from "@interviewiq/db";
import { getOrCreateOrchestrator, OrchestratorError } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { withMockMode } from "@/lib/with-mock-mode";

/**
 * Start (or resume) an interview.
 * - SETUP / BRIEFING → generates questions and emits the first one (idempotent)
 * - INTERVIEWING / WRAPPING_UP / COMPLETED → replays current state over SSE
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const rl = checkRateLimit(`start:${id}`, { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    try {
      const session = await prisma.session.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      if (session.status === "ABANDONED") {
        return NextResponse.json(
          { error: "This interview was abandoned and cannot be restarted" },
          { status: 400 },
        );
      }

      const orchestrator = getOrCreateOrchestrator(id);
      const outcome = await orchestrator.startInterview();
      return NextResponse.json({
        ok: true,
        resumed: outcome === "resumed",
        pending: outcome === "pending",
      });
    } catch (error) {
      console.error("Interview start failed:", error);

      const status = error instanceof OrchestratorError
        ? error.httpStatus
        : error instanceof Error && "status" in error && error.status === 429 ? 429 : 500;
      const messages: string[] = [];
      const seen = new Set<unknown>();
      let cause: unknown = error;
      while (cause != null && !seen.has(cause)) {
        seen.add(cause);
        if (!(cause instanceof Error)) {
          if (typeof cause === "string") messages.push(cause);
          break;
        }
        messages.push(cause.message || cause.name);
        cause = cause.cause;
      }

      return NextResponse.json(
        {
          error: messages.join("\nCaused by: ") || "Failed to start interview",
          code: error instanceof Error && "code" in error && typeof error.code === "string"
            ? error.code : "START_FAILED",
          ...(process.env.NODE_ENV === "development" && error instanceof Error && { stack: error.stack }),
          retryable: true,
        },
        { status },
      );
    }
  });
}
