import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

declare global {
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
  var __rateLimitSweeper: ReturnType<typeof setInterval> | undefined;
}

// Survive Next.js hot reload without leaking a new interval each time.
const store: Map<string, RateLimitEntry> = globalThis.__rateLimitStore ?? new Map();
globalThis.__rateLimitStore = store;

if (!globalThis.__rateLimitSweeper) {
  globalThis.__rateLimitSweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60_000);
  // Don't keep the process alive just for the sweeper
  globalThis.__rateLimitSweeper.unref?.();
}

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window in-memory limiter. Per-process only — adequate for a single
 * Node server, not for multi-instance serverless (see FIXES.md D1).
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      limit: options.maxRequests,
      retryAfterSeconds: 0,
    };
  }

  entry.count++;
  const remaining = Math.max(0, options.maxRequests - entry.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  return {
    allowed: entry.count <= options.maxRequests,
    remaining,
    limit: options.maxRequests,
    retryAfterSeconds,
  };
}

export function rateLimitResponse(result?: RateLimitResult) {
  const headers: Record<string, string> = {};
  if (result) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
    headers["X-RateLimit-Limit"] = String(result.limit);
    headers["X-RateLimit-Remaining"] = String(result.remaining);
  }
  return NextResponse.json(
    { error: "Too many requests. Please try again later.", code: "RATE_LIMITED", retryable: true },
    { status: 429, headers },
  );
}
