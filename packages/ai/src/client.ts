import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlock } from "@anthropic-ai/sdk/resources/messages";
import { isMockMode, delay } from "./mock";
import { mockIntroduction, mockQuestionSet } from "./mock/fixtures/question-set";
import { getNextMockEvaluation } from "./mock/fixtures/evaluation";
import { mockCoachingReport } from "./mock/fixtures/report";
import { getMockStageTransition } from "./mock/fixtures/stage-transition";
import { requireApiKey } from "./errors";

/**
 * Single place to configure the model. Override with CLAUDE_MODEL.
 * Default follows the project convention (Sonnet) on its current generation.
 */
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

/**
 * Cheaper model for the mid-interview coach ("explain this"). Each exchange is
 * a few hundred tokens, so the default is the current Haiku. Override with COACH_MODEL.
 */
export const COACH_MODEL = process.env.COACH_MODEL || "claude-haiku-4-5";

let anthropicClient: { key: string; client: Anthropic } | null = null;

/**
 * The Anthropic client, created on first use. Throws MissingApiKeyError when
 * ANTHROPIC_API_KEY is empty so callers get an actionable message instead of
 * an opaque authentication failure.
 */
function anthropic(): Anthropic {
  const apiKey = requireApiKey("anthropic");
  if (anthropicClient?.key !== apiKey) {
    anthropicClient = {
      key: apiKey,
      // We handle retries ourselves for proper rate limit backoff
      client: new Anthropic({ apiKey, maxRetries: 0 }),
    };
  }
  return anthropicClient.client;
}

const MAX_RETRIES = 3;
const DEFAULT_RATE_LIMIT_WAIT_MS = 15_000;
const MAX_RATE_LIMIT_WAIT_MS = 60_000;

function isRetryable(error: unknown): { retry: boolean; waitMs: number } {
  if (error instanceof Anthropic.RateLimitError) {
    const retryAfter = error.headers?.["retry-after"];
    const parsed = retryAfter ? parseInt(retryAfter, 10) : NaN;
    const waitMs = Number.isFinite(parsed)
      ? Math.min(parsed * 1000, MAX_RATE_LIMIT_WAIT_MS)
      : DEFAULT_RATE_LIMIT_WAIT_MS;
    return { retry: true, waitMs };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { retry: true, waitMs: 2_000 };
  }
  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? 0;
    // 529 = overloaded, 5xx = transient server errors
    if (status === 529 || status >= 500) return { retry: true, waitMs: 3_000 };
  }
  return { retry: false, waitMs: 0 };
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const { retry, waitMs } = isRetryable(error);
      if (!retry || attempt === MAX_RETRIES) throw error;
      const backoff = waitMs * Math.pow(1.5, attempt);
      console.log(
        `[AI] Transient error, waiting ${Math.round(backoff / 1000)}s before retry ${attempt + 1}/${MAX_RETRIES}`,
      );
      await delay(backoff);
    }
  }
  throw lastError;
}

// Routes mock responses based on system prompt content
function getMockJsonResponse(systemPrompt: string): unknown {
  const prompt = systemPrompt.toLowerCase();

  if (prompt.includes("question set") || prompt.includes("interview question")) {
    return prompt.includes("question 1 a self-introduction")
      ? { ...mockQuestionSet, questions: [mockIntroduction, ...mockQuestionSet.questions.slice(1)] }
      : mockQuestionSet;
  }
  if (prompt.includes("evaluate") || prompt.includes("candidate's answer")) {
    return getNextMockEvaluation();
  }
  if (prompt.includes("coaching report") || prompt.includes("debrief")) {
    return mockCoachingReport;
  }

  console.warn("[MOCK] Unrecognized prompt pattern, returning empty object");
  return {};
}

export class AIResponseParseError extends Error {
  constructor(
    message: string,
    public rawText: string,
  ) {
    super(message);
    this.name = "AIResponseParseError";
  }
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return cleaned.trim();
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; tool?: Anthropic.Messages.Tool },
): Promise<unknown> {
  if (isMockMode()) {
    await delay(300);
    console.log("[MOCK] callClaude — returning fixture");
    return getMockJsonResponse(systemPrompt);
  }

  const response = await withRetry(() =>
    anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.tool && {
        tools: [options.tool],
        tool_choice: { type: "tool" as const, name: options.tool.name },
      }),
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  );

  if (options?.tool) {
    const name = options.tool.name;
    if (response.stop_reason === "tool_use") {
      for (const block of response.content) {
        if (block.type === "tool_use" && block.name === name) return block.input;
      }
    }
    throw new Error(
      `Claude did not finish ${name} (model ${response.model}, stop reason ${response.stop_reason}, output tokens ${response.usage.output_tokens}).`,
    );
  }

  const rawText = extractTextContent(response.content);
  const cleaned = cleanJsonResponse(rawText);
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AIResponseParseError(
      "Failed to parse Claude response as JSON",
      rawText,
    );
  }
}

export async function callClaudeWithSearch(
  systemPrompt: string,
  userMessage: string,
): Promise<unknown> {
  if (isMockMode()) {
    await delay(400);
    console.log("[MOCK] callClaudeWithSearch — returning fixture");
    return getMockJsonResponse(systemPrompt);
  }

  const response = await withRetry(() =>
    anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 5,
        } as unknown as Anthropic.Messages.Tool,
      ],
    }),
  );

  const rawText = extractTextContent(response.content);
  const cleaned = cleanJsonResponse(rawText);

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AIResponseParseError(
      "Failed to parse Claude web search response as JSON",
      rawText,
    );
  }
}

export async function callClaudePlainText(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number },
): Promise<string> {
  if (isMockMode()) {
    await delay(250);
    console.log("[MOCK] callClaudePlainText — returning fixture");
    return getMockStageTransition();
  }

  const response = await withRetry(() =>
    anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: options?.maxTokens ?? 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  );

  return extractTextContent(response.content).trim();
}

/**
 * Stream plain text from Claude as an async iterable of deltas.
 * In mock mode yields the provided fixture in word-sized chunks.
 */
export async function* streamClaudeText(
  systemPrompt: string,
  userMessage: string,
  options: { model?: string; maxTokens?: number; mockText?: string; signal?: AbortSignal } = {},
): AsyncGenerator<string, void, void> {
  options.signal?.throwIfAborted();
  if (isMockMode()) {
    const text = options.mockText ?? "This is a mock coach answer.";
    for (const word of text.split(/(\s+)/)) {
      if (!word) continue;
      await delay(18);
      options.signal?.throwIfAborted();
      yield word;
    }
    return;
  }

  const stream = anthropic().messages.stream({
    model: options.model ?? CLAUDE_MODEL,
    max_tokens: options.maxTokens ?? 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  }, { signal: options.signal });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

function extractTextContent(content: ContentBlock[]): string {
  // The final answer is the run of text blocks at the end of the response.
  // With web search + citations the answer is split across several consecutive
  // text blocks, so join every trailing text block (stop at the first non-text
  // block such as a tool result or thinking block).
  const trailing: string[] = [];
  for (let i = content.length - 1; i >= 0; i--) {
    const block = content[i];
    if (block.type !== "text") {
      if (trailing.length > 0) break;
      continue;
    }
    trailing.unshift(block.text);
  }
  if (trailing.length === 0) {
    throw new AIResponseParseError(
      "No text content found in Claude response",
      JSON.stringify(content),
    );
  }
  return trailing.join("");
}
