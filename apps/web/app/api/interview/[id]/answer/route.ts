import { NextResponse } from "next/server";
import { prisma } from "@interviewiq/db";
import { getOrCreateOrchestrator, OrchestratorError } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { withMockMode } from "@/lib/with-mock-mode";

/** Generous ceiling for a spoken answer (a few minutes of compressed audio). */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const rl = checkRateLimit(`answer:${id}`, { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const session = await prisma.session.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status !== "INTERVIEWING") {
      return NextResponse.json(
        { error: `Session is ${session.status}, not accepting answers`, code: "NOT_INTERVIEWING" },
        { status: 409 },
      );
    }

    let audioFile: Blob;
    try {
      const formData = await request.formData();
      const field = formData.get("audio");
      if (!field || !(field instanceof Blob)) {
        return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
      }
      audioFile = field;
    } catch {
      return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
    }

    if (audioFile.size === 0) {
      return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
    }
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Audio file too large" }, { status: 413 });
    }

    try {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const orchestrator = getOrCreateOrchestrator(id);
      await orchestrator.handleAnswer(audioBuffer, audioFile.type || "audio/webm");
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof OrchestratorError && error.httpStatus < 500) {
        console.warn(`Answer rejected (${error.code}):`, error.message);
      } else {
        console.error("Answer submission failed:", error);
      }
      if (error instanceof OrchestratorError) {
        return NextResponse.json(
          { error: error.message, code: error.code, retryable: error.httpStatus >= 500 },
          { status: error.httpStatus },
        );
      }
      return NextResponse.json(
        { error: "Failed to process answer", retryable: true },
        { status: 500 },
      );
    }
  });
}
