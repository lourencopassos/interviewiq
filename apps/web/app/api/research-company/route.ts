import { NextResponse } from "next/server";
import { researchCompanyRequestSchema } from "@interviewiq/types";
import { researchCompanyCached } from "@interviewiq/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRequestClientId, getRequestIp, readJson } from "@/lib/http";
import { jsonError } from "@/lib/api-response";
import { withMockMode } from "@/lib/with-mock-mode";

export async function POST(request: Request) {
  return withMockMode(async () => {
    const body = await readJson(request);
    if (body === null) {
      return jsonError(400, "INVALID_JSON", "Invalid JSON body");
    }

    const parsed = researchCompanyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "INVALID_REQUEST", "Invalid request", { details: parsed.error.flatten() });
    }

    const caller = parsed.data.clientId ?? getRequestClientId(request) ?? `ip:${getRequestIp(request)}`;
    const rl = checkRateLimit(`research:${caller}`, { maxRequests: 5, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Never throws: research is optional, an empty result lets the interview proceed.
    const { intel, cached } = await researchCompanyCached(
      parsed.data.companyName,
      parsed.data.jobTitle,
      parsed.data.primarySkills,
    );
    if (cached) console.log(`[Research] Cache hit for "${parsed.data.companyName}"`);

    return NextResponse.json(intel);
  });
}
