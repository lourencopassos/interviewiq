import { NextResponse } from "next/server";
import { researchCompanyRequestSchema } from "@interviewiq/types";
import { researchCompanyCached } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse, readJson } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = researchCompanyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rl = checkRateLimit(`research:${parsed.data.clientId ?? "anonymous"}`, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const { intel, cached } = await researchCompanyCached(
    parsed.data.companyName,
    parsed.data.jobTitle,
    parsed.data.primarySkills,
  );
  if (cached) console.log(`[Research] Cache hit for "${parsed.data.companyName}"`);

  return NextResponse.json(intel);
}
