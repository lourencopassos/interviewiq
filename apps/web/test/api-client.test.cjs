// Run with: node --require tsx/cjs --test test/*.test.cjs (from apps/web)
const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { apiFetch, apiRequest, ApiError, NetworkError } = require("../lib/api-client");

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Replace fetch with one that records its call and answers with `response`. */
function stubFetch(response) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    if (response instanceof Error) throw response;
    return response;
  };
  return calls;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("sends JSON with the client id header and returns the parsed body", async () => {
  const calls = stubFetch(json({ id: "s1" }, 201));
  const result = await apiFetch("/api/sessions", { method: "POST", json: { a: 1 } });
  assert.deepEqual(result, { id: "s1" });
  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get("content-type"), "application/json");
  assert.ok(headers.has("x-client-id"));
  assert.equal(calls[0].init.body, JSON.stringify({ a: 1 }));
});

test("decodes the API error body into an ApiError", async () => {
  stubFetch(
    json(
      {
        error: {
          code: "MISSING_API_KEY",
          message: "OPENAI_API_KEY is not set",
          retryable: false,
          provider: "openai",
        },
      },
      503,
    ),
  );
  await assert.rejects(apiRequest("/api/interview/s1/answer", { method: "POST" }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "MISSING_API_KEY");
    assert.equal(error.status, 503);
    assert.equal(error.retryable, false);
    assert.equal(error.provider, "openai");
    return true;
  });
});

test("a body outside the contract still becomes an ApiError keyed by status", async () => {
  stubFetch(new Response("<html>Bad gateway</html>", { status: 502 }));
  await assert.rejects(apiRequest("/api/sessions"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "INTERNAL_ERROR");
    assert.equal(error.retryable, true);
    return true;
  });

  stubFetch(new Response("", { status: 403 }));
  await assert.rejects(
    apiRequest("/api/sessions/x"),
    (error) => error instanceof ApiError && error.code === "FORBIDDEN",
  );
});

test("a rejected fetch becomes a NetworkError, an abort stays an abort", async () => {
  stubFetch(new TypeError("Failed to fetch"));
  await assert.rejects(apiRequest("/api/sessions"), (error) => error instanceof NetworkError);

  stubFetch(new DOMException("aborted", "AbortError"));
  await assert.rejects(apiRequest("/api/sessions"), (error) => error.name === "AbortError");
});

test("2xx statuses other than 200 are returned to the caller", async () => {
  stubFetch(json({ status: "WRAPPING_UP" }, 202));
  const response = await apiRequest("/api/sessions/s1/report");
  assert.equal(response.status, 202);
});
