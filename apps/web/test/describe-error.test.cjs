// Run with: node --require tsx/cjs --test test/*.test.cjs (from apps/web)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ERROR_CODES } = require("@interviewiq/types");
const { getDictionary } = require("../lib/i18n/dictionaries");
const { ApiError, NetworkError } = require("../lib/api-client");
const { ClientError, describeError, toUiError } = require("../lib/errors");

const LOCALES = ["en", "pt", "es"];

test("every server error code has copy in every interface language", () => {
  for (const locale of LOCALES) {
    const t = getDictionary(locale);
    for (const code of ERROR_CODES) {
      assert.ok(t.errors.api[code], `${locale}: missing errors.api.${code}`);
    }
  }
});

test("MISSING_API_KEY names the env var for the provider", () => {
  const t = getDictionary("en");
  const cases = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    elevenlabs: "ELEVENLABS_API_KEY",
  };
  for (const [provider, envVar] of Object.entries(cases)) {
    const error = new ApiError("MISSING_API_KEY", { status: 503, retryable: false, provider });
    assert.match(describeError(t, error), new RegExp(envVar));
  }
  const generic = new ApiError("MISSING_API_KEY", { status: 503, retryable: false });
  assert.equal(describeError(t, generic), t.errors.api.MISSING_API_KEY);
});

test("server messages are never rendered", () => {
  const t = getDictionary("pt");
  const error = new ApiError("RATE_LIMITED", {
    status: 429,
    retryable: true,
    message: "Too many requests",
  });
  assert.equal(describeError(t, error), t.errors.api.RATE_LIMITED);
});

test("browser-side failures map to client copy", () => {
  const t = getDictionary("es");
  assert.equal(describeError(t, new NetworkError()), t.errors.client.NETWORK);
  assert.equal(describeError(t, new TypeError("Failed to fetch")), t.errors.client.NETWORK);
  assert.equal(describeError(t, new ClientError("MIC_NOT_FOUND")), t.errors.client.MIC_NOT_FOUND);
  assert.equal(describeError(t, new Error("boom")), t.errors.client.UNKNOWN);
  assert.equal(toUiError("weird", "RECORD_FAILED").code, "RECORD_FAILED");
});
