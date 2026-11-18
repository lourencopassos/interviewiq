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

    try {
      const orchestrator = getOrCreateOrchestrator(id);
      const outcome = await orchestrator.startInterview();
      return NextResponse.json({
        ok: true,
        resumed: outcome === "resumed",
        pending: outcome === "pending",
      });
    } catch (error) {
      console.error("Interview start failed:", error);

      if (error instanceof OrchestratorError) {
        return NextResponse.json(
          { error: error.message, code: error.code, retryable: true },
          { status: error.httpStatus },
        );
      }

      const message = error instanceof Error ? error.message : "";
      if (message.includes("429")) {
        return NextResponse.json(
          { error: "Rate limited — please try again in a moment", retryable: true },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { error: "Failed to start interview", retryable: true },
        { status: 500 },
      );
    }
  });
}
