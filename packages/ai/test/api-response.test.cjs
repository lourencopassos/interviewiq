// Run with node --require tsx/cjs --test packages/ai/test/api-response.test.cjs
// The web app's error envelope, loaded directly by tsx (it only needs next/server).
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { apiErrorBodySchema } = require("@interviewiq/types");
const { AppError, MissingApiKeyError } = require("../src/errors");

const { apiError, apiOk } = require(path.resolve(__dirname, "../../../apps/web/lib/api-response"));

beforeEach((t) => {
  for (const level of ["warn", "error"]) t.mock.method(console, level, () => {});
});

async function read(response) {
  const body = await response.json();
  assert.ok(apiErrorBodySchema.safeParse(body).success, JSON.stringify(body));
  return { status: response.status, error: body.error };
}

test("a bare code maps to its status, fallback copy and retry hint", async () => {
  assert.deepEqual(await read(apiError("SESSION_NOT_FOUND")), {
    status: 404,
    error: { code: "SESSION_NOT_FOUND", message: "Session not found", retryable: false },
  });
  assert.equal((await read(apiError("RATE_LIMITED"))).error.retryable, true);
});

test("an AppError keeps its code and status", async () => {
  const { status, error } = await read(apiError(new AppError("ANSWER_IN_FLIGHT")));
  assert.equal(status, 409);
  assert.equal(error.code, "ANSWER_IN_FLIGHT");
});

test("a missing key names the provider", async () => {
  const { status, error } = await read(apiError(new MissingApiKeyError("elevenlabs")));
  assert.equal(status, 503);
  assert.equal(error.code, "MISSING_API_KEY");
  assert.equal(error.provider, "elevenlabs");
  assert.equal(error.retryable, false);
});

test("unknown errors use the fallback code and never leak their message", async () => {
  const { status, error } = await read(apiError(new Error("upstream said: sk-secret"), { fallback: "START_FAILED" }));
  assert.equal(status, 500);
  assert.equal(error.code, "START_FAILED");
  assert.doesNotMatch(error.message, /secret/);
  assert.equal((await read(apiError("not a code"))).error.code, "INTERNAL_ERROR");
});

test("a provider 429 becomes UPSTREAM_RATE_LIMITED", async () => {
  const upstream = Object.assign(new Error("rate limited"), { status: 429 });
  const { status, error } = await read(apiError(upstream, { fallback: "START_FAILED" }));
  assert.equal(status, 429);
  assert.equal(error.code, "UPSTREAM_RATE_LIMITED");
  assert.equal(error.retryable, true);
});

test("headers pass through and server errors are logged", async (t) => {
  const response = apiError("RATE_LIMITED", { headers: { "Retry-After": "7" } });
  assert.equal(response.headers.get("Retry-After"), "7");

  const logged = t.mock.method(console, "error", () => {});
  apiError(new Error("boom"), { log: "Thing failed" });
  assert.equal(logged.mock.callCount(), 1);
});

test("apiOk returns the data with the given init", async () => {
  const response = apiOk({ ok: true }, { status: 201 });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
});
