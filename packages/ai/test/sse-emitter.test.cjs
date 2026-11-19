// Run with node --require tsx/cjs --test packages/ai/test/sse-emitter.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { SSEEmitter } = require("../src/sse/emitter");

const decoder = new TextDecoder();

function fakeController({ throwOnEnqueue = false } = {}) {
  return {
    chunks: [],
    closed: 0,
    enqueue(bytes) {
      if (throwOnEnqueue) throw new TypeError("Invalid state: Controller is already closed");
      this.chunks.push(decoder.decode(bytes));
    },
    close() {
      this.closed++;
    },
    events() {
      return this.chunks
        .filter((c) => c.startsWith("data: "))
        .map((c) => JSON.parse(c.slice("data: ".length)));
    },
  };
}

// Each test uses its own emitter (not the singleton) and unregisters at the end
// so the 15 s heartbeat intervals never keep the process alive.
function setup(t) {
  const emitter = new SSEEmitter();
  const ids = new Set();
  const register = (id, controller) => {
    ids.add(id);
    emitter.register(id, controller);
  };
  t.after(() => ids.forEach((id) => emitter.unregister(id)));
  return { emitter, register };
}

const event = (n) => ({ type: "transition_text", data: { message: `m${n}` } });

test("emit writes an SSE data frame to the registered controller", (t) => {
  const { emitter, register } = setup(t);
  const c = fakeController();
  register("s1", c);
  emitter.emit("s1", event(1));
  assert.deepEqual(c.chunks, [`data: ${JSON.stringify(event(1))}\n\n`]);
});

test("register replaces the previous controller and closes it", (t) => {
  const { emitter, register } = setup(t);
  const first = fakeController();
  const second = fakeController();
  register("s1", first);
  register("s1", second);
  assert.equal(first.closed, 1);
  assert.equal(second.closed, 0);

  emitter.emit("s1", event(1));
  assert.deepEqual(first.events(), []);
  assert.deepEqual(second.events(), [event(1)]);
});

test("unregister with a stale controller does not drop the newer one", (t) => {
  const { emitter, register } = setup(t);
  const stale = fakeController();
  const fresh = fakeController();
  register("s1", stale);
  register("s1", fresh);

  emitter.unregister("s1", stale);
  emitter.emit("s1", event(2));
  assert.deepEqual(fresh.events(), [event(2)]);

  emitter.unregister("s1", fresh);
  emitter.emit("s1", event(3));
  assert.deepEqual(fresh.events(), [event(2)]);
});

test("unregister without a controller removes the current connection", (t) => {
  const { emitter, register } = setup(t);
  const c = fakeController();
  register("s1", c);
  emitter.unregister("s1");
  emitter.emit("s1", event(1));
  assert.deepEqual(c.chunks, []);
});

test("emit to an unknown session is a no-op", (t) => {
  const { emitter, register } = setup(t);
  const c = fakeController();
  register("s1", c);
  assert.doesNotThrow(() => emitter.emit("nope", event(1)));
  assert.deepEqual(c.chunks, []);
});

test("a throwing controller is dropped and closed", (t) => {
  const { emitter, register } = setup(t);
  const broken = fakeController({ throwOnEnqueue: true });
  register("s1", broken);
  assert.doesNotThrow(() => emitter.emit("s1", event(1)));
  assert.equal(broken.closed, 1);

  // Later emits don't touch the dropped controller again.
  let calls = 0;
  broken.enqueue = () => {
    calls++;
  };
  emitter.emit("s1", event(2));
  assert.equal(calls, 0);
});

test("sessions are isolated from each other", (t) => {
  const { emitter, register } = setup(t);
  const a = fakeController();
  const b = fakeController();
  register("a", a);
  register("b", b);
  emitter.emit("a", event(1));
  assert.deepEqual(a.events(), [event(1)]);
  assert.deepEqual(b.events(), []);
});
