import { NextResponse } from "next/server";
import { getOrCreateOrchestrator } from "@interviewiq/ai";
import { iceCandidateRequestSchema } from "@interviewiq/types";
import { withMockMode } from "@/lib/with-mock-mode";
import { readJson } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withMockMode(async () => {
    const parsed = iceCandidateRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const relayed = await getOrCreateOrchestrator(id).handleIceCandidate(parsed.data.candidate);
      return NextResponse.json({ ok: relayed });
    } catch (error) {
      console.error("ICE candidate relay failed:", error);
      return NextResponse.json({ error: "Failed to relay ICE candidate" }, { status: 502 });
    }
  });
}
