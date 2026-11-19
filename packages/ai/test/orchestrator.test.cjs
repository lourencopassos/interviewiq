// Run with node --require tsx/cjs --test packages/ai/test/orchestrator.test.cjs
// InterviewOrchestrator end to end against an in-memory prisma, in mock mode
// (Claude, Whisper and ElevenLabs return fixtures; no network, no DB).
process.env.ANTHROPIC_API_KEY ||= "test-key";
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { installFakePrisma } = require("./fake-prisma.cjs");
const { runWithMockMode } = require("../src/mock");
const { resetMockEvaluations } = require("../src/mock/fixtures/evaluation");
const { mockQuestionSet } = require("../src/mock/fixtures/question-set");
const { sseEmitter } = require("../src/sse/emitter");
const {
  InterviewOrchestrator,
  getOrCreateOrchestrator,
} = require("../src/interview");

const QUESTION_COUNT = mockQuestionSet.questions.length; // 6
// Indices into the mock evaluation rotation (src/mock/fixtures/evaluation.ts).
const EVAL_78 = 0; // normal progression
const EVAL_52_FOLLOW_UP = 1; // score 52 with a proposed follow-up

/** Make the next mock evaluation(s) a fixed entry of the rotation. */
function pinEvaluation(index) {
  resetMockEvaluations();
  globalThis.__mockEvalCounter.set("default", index);
}

const decoder = new TextDecoder();
const realSetTimeout = globalThis.setTimeout;

beforeEach((t) => {
  // Mock-mode fixtures sleep 150–400 ms to feel real; run them immediately.
  t.mock.method(globalThis, "setTimeout", (fn, _ms, ...args) => realSetTimeout(fn, 0, ...args));
  for (const level of ["log", "warn", "error"]) t.mock.method(console, level, () => {});
  resetMockEvaluations();
});

/** Fresh store + SETUP session + SSE capture for one test. */
function setup(t, sessionOverrides = {}) {
  const store = installFakePrisma(t);
  const sessionId = `sess_${randomUUID()}`;
  store.db.sessions.push({
    id: sessionId,
    clientId: "client",
    status: "SETUP",
    companyName: "Acme",
    jobTitle: "Frontend Engineer",
    difficulty: "MID",
    interviewType: "TECHNICAL",
    language: "EN",
    parsedJob: "{}",
    companyIntel: null,
    resumeText: null,
    videoMode: false,
    avatarImageUrl: null,
    coachEnabled: false,
    currentIndex: 0,
    opening: null,
    closing: null,
    ...sessionOverrides,
  });

  const events = [];
  const controller = {
    enqueue(bytes) {
      const text = decoder.decode(bytes);
      if (text.startsWith("data: ")) events.push(JSON.parse(text.slice("data: ".length)));
    },
    close() {},
  };
  sseEmitter.register(sessionId, controller);

  t.after(() => {
    sseEmitter.unregister(sessionId, controller);
    globalThis.__orchestrators.delete(sessionId);
  });

  const session = () => store.db.sessions.find((s) => s.id === sessionId);
  const questions = () =>
    store.db.questions.filter((q) => q.sessionId === sessionId).sort((a, b) => a.order - b.order);
  const types = () => events.map((e) => e.type);
  const take = () => events.splice(0, events.length);
  const mock = (fn) => runWithMockMode(true, fn);

  return { store, sessionId, events, session, questions, types, take, mock };
}

const AUDIO = Buffer.from("fake audio");

async function started(t, overrides) {
  const ctx = setup(t, overrides);
  const orchestrator = getOrCreateOrchestrator(ctx.sessionId);
  assert.equal(await ctx.mock(() => orchestrator.startInterview()), "started");
  ctx.take();
  return { ...ctx, orchestrator };
}

const isFollowUp = (row) => JSON.parse(row.metadata ?? "{}").isFollowUp === true;

function assertDenseOrder(rows) {
  assert.deepEqual(rows.map((q) => q.order), rows.map((_, i) => i));
}

test("startInterview claims SETUP once under concurrent calls", async (t) => {
  const ctx = setup(t);
  const orchestrator = getOrCreateOrchestrator(ctx.sessionId);
  const results = await ctx.mock(() =>
    Promise.all([orchestrator.startInterview(), orchestrator.startInterview()]),
  );

  assert.equal(results[0], "started");
  assert.ok(["pending", "resumed"].includes(results[1]), results[1]);
  assert.equal(ctx.questions().length, QUESTION_COUNT);
  assertDenseOrder(ctx.questions());
  assert.equal(ctx.session().status, "INTERVIEWING");
  assert.equal(ctx.session().currentIndex, 0);

  assert.deepEqual(ctx.types(), ["state_change", "question_ready", "audio_ready"]);
  const [state, ready, audio] = ctx.events;
  assert.deepEqual(state.data, { status: "INTERVIEWING" });
  assert.equal(ready.data.order, 1);
  assert.equal(ready.data.total, QUESTION_COUNT);
  assert.equal(ready.data.questionId, ctx.questions()[0].id);
  assert.equal(audio.data.questionId, ctx.questions()[0].id);
  assert.match(audio.data.audioUrl, /^\/api\/audio\//);

  // A later start (e.g. another instance after the first finished) only resumes.
  ctx.take();
  const second = new InterviewOrchestrator(ctx.sessionId);
  assert.equal(await ctx.mock(() => second.startInterview()), "resumed");
  assert.equal(ctx.questions().length, QUESTION_COUNT);
  assert.deepEqual(ctx.types(), []);
});

test("a start failure before commit rolls back to SETUP", async (t) => {
  const ctx = setup(t);
  // The generator "returns" nothing: no rows are written, so loadQuestions() is empty.
  // (The fake delegates are the objects installed on `prisma`, so this patches the live client.)
  ctx.store.delegates.question.createMany = async () => ({ count: 0 });

  const orchestrator = getOrCreateOrchestrator(ctx.sessionId);
  await assert.rejects(ctx.mock(() => orchestrator.startInterview()), { code: "EMPTY_QUESTION_SET" });

  assert.equal(ctx.session().status, "SETUP");
  assert.deepEqual(ctx.types(), ["error"]);
  assert.equal(ctx.events[0].data.code, "EMPTY_QUESTION_SET");
  assert.equal(ctx.events[0].data.retryable, true);
  // The failed instance is dropped so a retry gets a fresh one.
  assert.notEqual(getOrCreateOrchestrator(ctx.sessionId), orchestrator);
});

test("handleAnswer happy path scores and presents the next question", async (t) => {
  const ctx = await started(t);
  pinEvaluation(EVAL_78);
  await ctx.mock(() => ctx.orchestrator.handleAnswer(AUDIO));

  const [first, second] = ctx.questions();
  assert.deepEqual(ctx.types(), [
    "transcription_complete",
    "evaluation_complete",
    "transition_text",
    "question_ready",
    "audio_ready",
  ]);
  assert.equal(ctx.events[0].data.questionId, first.id);
  assert.deepEqual(ctx.events[1].data, { questionId: first.id, score: 78, tier: "good" });
  assert.equal(ctx.events[3].data.order, 2);
  assert.equal(ctx.events[3].data.questionId, second.id);
  assert.equal(ctx.events[3].data.isFollowUp, false);

  assert.equal(ctx.session().currentIndex, 1);
  assert.equal(first.score, 78);
  assert.equal(typeof first.transcript, "string");
  assert.deepEqual(JSON.parse(first.strengths).length > 0, true);
  assert.equal(ctx.questions().length, QUESTION_COUNT);
});

test("follow-ups keep order dense and are never chained", async (t) => {
  const ctx = await started(t);
  const originalIds = ctx.questions().map((q) => q.id);

  // Weak answer to Q1 → follow-up inserted right after it.
  pinEvaluation(EVAL_52_FOLLOW_UP);
  await ctx.mock(() => ctx.orchestrator.handleAnswer(AUDIO));
  let rows = ctx.questions();
  assert.equal(rows.length, QUESTION_COUNT + 1);
  assertDenseOrder(rows);
  assert.ok(isFollowUp(rows[1]));
  assert.equal(JSON.parse(rows[1].metadata).parentQuestionId, originalIds[0]);
  assert.equal(ctx.session().currentIndex, 1);
  const ready = ctx.events.find((e) => e.type === "question_ready");
  assert.deepEqual(
    { order: ready.data.order, total: ready.data.total, isFollowUp: ready.data.isFollowUp, id: ready.data.questionId },
    { order: 2, total: QUESTION_COUNT + 1, isFollowUp: true, id: rows[1].id },
  );

  // Weak answer to the follow-up → no follow-up of a follow-up; back to Q2.
  ctx.take();
  pinEvaluation(EVAL_52_FOLLOW_UP);
  await ctx.mock(() => ctx.orchestrator.handleAnswer(AUDIO));
  rows = ctx.questions();
  assert.equal(rows.length, QUESTION_COUNT + 1);
  assert.equal(ctx.session().currentIndex, 2);
  assert.equal(rows[2].id, originalIds[1]);
  assert.equal(ctx.events.find((e) => e.type === "question_ready").data.isFollowUp, false);

  // Weak answer to Q2 → a new follow-up after Q2; everything after it shifts by one.
  pinEvaluation(EVAL_52_FOLLOW_UP);
  await ctx.mock(() => ctx.orchestrator.handleAnswer(AUDIO));
  rows = ctx.questions();
  assert.equal(rows.length, QUESTION_COUNT + 2);
  assertDenseOrder(rows);
  assert.equal(new Set(rows.map((q) => q.order)).size, rows.length);
  assert.deepEqual(
    rows.filter((q) => !isFollowUp(q)).map((q) => q.id),
    originalIds,
    "original questions keep their relative order",
  );
  assert.deepEqual(rows.map(isFollowUp), [false, true, false, true, false, false, false, false]);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(!(isFollowUp(rows[i - 1]) && isFollowUp(rows[i])), `follow-ups chained at ${i}`);
  }
});

test("a second submit for an already-answered question replays instead of re-scoring", async (t) => {
  const ctx = await started(t);
  // Simulate a partial failure: the answer was persisted but the session never advanced.
  const current = ctx.questions()[0];
  current.transcript = "already answered";
  current.score = 70;

  await ctx.mock(() => ctx.orchestrator.handleAnswer(AUDIO));

  assert.deepEqual(ctx.types(), ["question_ready", "audio_ready"]);
  assert.equal(ctx.events[0].data.questionId, current.id);
  assert.equal(ctx.events[0].data.order, 1);
  assert.equal(current.score, 70);
  assert.equal(current.transcript, "already answered");
  assert.equal(ctx.questions().length, QUESTION_COUNT);
  assert.equal(ctx.session().currentIndex, 0);
  assert.equal(globalThis.__mockEvalCounter.get("default"), undefined, "evaluator not called");
});

test("a concurrent second submit is rejected while the first is in flight", async (t) => {
  const ctx = await started(t);
  pinEvaluation(EVAL_78);
  const results = await ctx.mock(() =>
    Promise.allSettled([ctx.orchestrator.handleAnswer(AUDIO), ctx.orchestrator.handleAnswer(AUDIO)]),
  );
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
  assert.equal(results[1].reason.code, "ANSWER_IN_FLIGHT");
  assert.equal(ctx.types().filter((type) => type === "evaluation_complete").length, 1);
  assert.equal(ctx.session().currentIndex, 1);
});

test("answering the last question wraps up, writes the report and completes", async (t) => {
  const ctx = await started(t);
  for (let i = 0; i < QUESTION_COUNT; i++) {
    pinEvaluation(EVAL_78);
    await ctx.mock(() => ctx.orchestrator.handleAnswer(AUDIO));
  }

  const tail = ctx.types().slice(ctx.types().lastIndexOf("evaluation_complete") + 1);
  assert.deepEqual(tail, [
    "state_change",
    "transition_text",
    "audio_ready",
    "state_change",
    "interview_complete",
  ]);
  const states = ctx.events.filter((e) => e.type === "state_change").map((e) => e.data.status);
  assert.deepEqual(states, ["WRAPPING_UP", "COMPLETED"]);
  assert.deepEqual(ctx.events.at(-1).data, {
    sessionId: ctx.sessionId,
    redirectTo: `/report/${ctx.sessionId}`,
  });

  assert.equal(ctx.session().status, "COMPLETED");
  assert.ok(ctx.questions().every((q) => q.score === 78));
  const reports = ctx.store.db.reports.filter((r) => r.sessionId === ctx.sessionId);
  assert.equal(reports.length, 1);
  assert.equal(typeof reports[0].overallScore, "number");
  assert.equal(JSON.parse(reports[0].summary).overallScore, reports[0].overallScore);
  assert.equal(globalThis.__orchestrators.has(ctx.sessionId), false, "runtime torn down");

  // Late submits are refused once the interview is over.
  await assert.rejects(
    ctx.mock(() => getOrCreateOrchestrator(ctx.sessionId).handleAnswer(AUDIO)),
    { code: "NOT_INTERVIEWING" },
  );
});

test("resume on INTERVIEWING replays the current question without moving", async (t) => {
  const ctx = await started(t);
  pinEvaluation(EVAL_78);
  await ctx.mock(() => ctx.orchestrator.handleAnswer(AUDIO));
  ctx.take();

  // A reconnect may land on a different instance (e.g. after a dev reload).
  const update = t.mock.method(require("@interviewiq/db").prisma.session, "update");
  await ctx.mock(() => new InterviewOrchestrator(ctx.sessionId).resume());

  assert.deepEqual(ctx.types(), ["state_change", "question_ready", "audio_ready"]);
  assert.deepEqual(ctx.events[0].data, { status: "INTERVIEWING" });
  assert.equal(ctx.events[1].data.order, 2);
  assert.equal(ctx.events[1].data.questionId, ctx.questions()[1].id);
  assert.equal(ctx.events[2].data.questionId, ctx.questions()[1].id);
  assert.equal(ctx.session().currentIndex, 1);
  assert.equal(update.mock.callCount(), 0, "resume does not write the index");
});

test("resume on COMPLETED only replays the completion redirect", async (t) => {
  const ctx = setup(t, { status: "COMPLETED" });
  await ctx.mock(() => getOrCreateOrchestrator(ctx.sessionId).resume());
  assert.deepEqual(ctx.types(), ["state_change", "interview_complete"]);
  assert.deepEqual(ctx.events[0].data, { status: "COMPLETED" });
});

test("Full Loop sends stage enums and every emitted event matches the client schema", async (t) => {
  const { interviewEventSchema } = require("@interviewiq/types");
  const ctx = setup(t, { interviewType: "FULL_LOOP", language: "PT_BR" });
  const orchestrator = getOrCreateOrchestrator(ctx.sessionId);
  assert.equal(await ctx.mock(() => orchestrator.startInterview()), "started");

  assert.deepEqual(ctx.types(), ["state_change", "stage_transition", "question_ready", "audio_ready"]);
  assert.deepEqual(ctx.events[1].data, {
    completedStage: null,
    stageScore: 0,
    nextStage: "PHONE_SCREEN",
    transitionAudioUrl: null,
  });
  assert.equal(ctx.events[2].data.stage, "PHONE_SCREEN");

  const phoneScreen = ctx.questions().filter((q) => q.stage === "PHONE_SCREEN").length;
  for (let i = 0; i < phoneScreen; i++) {
    pinEvaluation(EVAL_78);
    await ctx.mock(() => orchestrator.handleAnswer(AUDIO));
  }

  const boundary = ctx.events.filter((e) => e.type === "stage_transition").at(-1);
  assert.equal(boundary.data.completedStage, "PHONE_SCREEN");
  assert.equal(boundary.data.nextStage, "TECHNICAL");
  assert.equal(boundary.data.stageScore, 78);
  assert.match(boundary.data.transitionAudioUrl, /^\/api\/audio\//);
  assert.equal(ctx.events.at(-2).data.stage, "TECHNICAL");

  for (const event of ctx.events) {
    const result = interviewEventSchema.safeParse(event);
    assert.ok(result.success, `${event.type}: ${result.success ? "" : result.error.message}`);
  }
});

test("the closing falls back to the session language when none was generated", async (t) => {
  const ctx = await started(t, { language: "ES" });
  ctx.session().closing = null;
  for (let i = 0; i < QUESTION_COUNT; i++) {
    pinEvaluation(EVAL_78);
    await ctx.mock(() => ctx.orchestrator.handleAnswer(AUDIO));
  }
  const closing = ctx.events.filter((e) => e.type === "transition_text").at(-1);
  assert.equal(closing.data.message, "Con esto terminamos la entrevista. Gracias por tu tiempo hoy.");
});
