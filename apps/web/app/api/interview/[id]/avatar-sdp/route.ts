import { NextResponse } from "next/server";
import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { sdpAnswerRequestSchema } from "@interviewiq/types";
import { withMockMode } from "@/lib/with-mock-mode";
import { readJson } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const parsed = sdpAnswerRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const relayed = await getOrCreateOrchestrator(id).handleSdpAnswer(parsed.data.sdpAnswer);
      if (!relayed) {
        return NextResponse.json(
          { ok: false, error: "No active avatar stream for this session" },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("SDP answer relay failed:", error);
      return NextResponse.json({ error: "Failed to relay SDP answer" }, { status: 502 });
    }
  });
}
