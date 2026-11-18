import { NextResponse } from "next/server";
import { parseJobRequestSchema } from "@interviewiq/types";
import { parseJobDescription } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse, readJson } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rl = checkRateLimit(`parse-job:${parsed.data.clientId ?? "anonymous"}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const result = await parseJobDescription(parsed.data.jobDescription);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Job parsing failed:", error);
    return NextResponse.json(
      { error: "Failed to parse job description. Please try again.", retryable: true },
      { status: 502 },
    );
  }
}
