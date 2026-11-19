// Run with node --require tsx/cjs --test packages/ai/test/adaptive-engine.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  AdaptiveEngine,
  FOLLOW_UP_THRESHOLD,
  SKIP_THRESHOLD,
} = require("../src/services/adaptive-engine");

const engine = new AdaptiveEngine();

function q(id, overrides = {}) {
  return { id, difficulty: 3, stage: null, isFollowUp: false, ...overrides };
}

function evaluation(score, followUp = null) {
  return {
    score,
    tier: score >= 80 ? "excellent" : score >= 60 ? "good" : "poor",
    shortFeedback: "ok",
    followUpNeeded: followUp !== null,
    followUp,
    keyStrengths: [],
    gaps: [],
  };
}

test("thresholds are the documented ones", () => {
  assert.equal(FOLLOW_UP_THRESHOLD, 65);
  assert.equal(SKIP_THRESHOLD, 88);
});

test("offers a follow-up when the score is below 65 and the evaluator proposes one", () => {
  const questions = [q("a"), q("b"), q("c")];
  assert.deepEqual(engine.selectNext(questions, evaluation(52, "Why?"), 0), {
    kind: "followUp",
    text: "Why?",
  });
});

test("does not follow up when the evaluator proposes nothing", () => {
  const questions = [q("a"), q("b")];
  const noText = { ...evaluation(40), followUpNeeded: true, followUp: null };
  assert.deepEqual(engine.selectNext(questions, noText, 0), { kind: "question", index: 1, skipped: false });
  const notNeeded = { ...evaluation(40), followUpNeeded: false, followUp: "Why?" };
  assert.deepEqual(engine.selectNext(questions, notNeeded, 0), { kind: "question", index: 1, skipped: false });
});

test("never chains a follow-up onto a follow-up", () => {
  const questions = [q("a"), q("a-fu", { isFollowUp: true }), q("b")];
  assert.deepEqual(engine.selectNext(questions, evaluation(30, "Again?"), 1), {
    kind: "question",
    index: 2,
    skipped: false,
  });
});

test("no follow-up at exactly 65", () => {
  const questions = [q("a"), q("b")];
  assert.deepEqual(engine.selectNext(questions, evaluation(65, "Why?"), 0), {
    kind: "question",
    index: 1,
    skipped: false,
  });
});

test("skips one easy question after a score above 88 within the same stage", () => {
  const questions = [
    q("a", { stage: "TECHNICAL" }),
    q("b", { stage: "TECHNICAL", difficulty: 2 }),
    q("c", { stage: "TECHNICAL" }),
  ];
  assert.deepEqual(engine.selectNext(questions, evaluation(91), 0), {
    kind: "question",
    index: 2,
    skipped: true,
  });
});

test("skips within a standard interview where every stage is null", () => {
  const questions = [q("a"), q("b", { difficulty: 1 }), q("c")];
  assert.deepEqual(engine.selectNext(questions, evaluation(95), 0), {
    kind: "question",
    index: 2,
    skipped: true,
  });
});

test("does not skip a question of difficulty 3 or more", () => {
  const questions = [q("a"), q("b", { difficulty: 3 }), q("c")];
  assert.deepEqual(engine.selectNext(questions, evaluation(95), 0), {
    kind: "question",
    index: 1,
    skipped: false,
  });
});

test("does not skip across a stage boundary (next question in another stage)", () => {
  const questions = [
    q("a", { stage: "PHONE_SCREEN" }),
    q("b", { stage: "TECHNICAL", difficulty: 1 }),
    q("c", { stage: "TECHNICAL" }),
  ];
  assert.deepEqual(engine.selectNext(questions, evaluation(95), 0), {
    kind: "question",
    index: 1,
    skipped: false,
  });
});

test("does not skip when the question after next is in another stage", () => {
  const questions = [
    q("a", { stage: "TECHNICAL" }),
    q("b", { stage: "TECHNICAL", difficulty: 1 }),
    q("c", { stage: "BEHAVIORAL" }),
  ];
  assert.deepEqual(engine.selectNext(questions, evaluation(95), 0), {
    kind: "question",
    index: 1,
    skipped: false,
  });
});

test("does not skip the last remaining question", () => {
  const questions = [q("a"), q("b", { difficulty: 1 })];
  assert.deepEqual(engine.selectNext(questions, evaluation(95), 0), {
    kind: "question",
    index: 1,
    skipped: false,
  });
});

test("no skip at exactly 88", () => {
  const questions = [q("a"), q("b", { difficulty: 1 }), q("c")];
  assert.deepEqual(engine.selectNext(questions, evaluation(88), 0), {
    kind: "question",
    index: 1,
    skipped: false,
  });
});

test("completes when no questions remain", () => {
  const questions = [q("a"), q("b")];
  assert.deepEqual(engine.selectNext(questions, evaluation(78), 1), { kind: "complete" });
  assert.deepEqual(engine.selectNext(questions, evaluation(95), 1), { kind: "complete" });
});

test("still offers a follow-up on the last question", () => {
  const questions = [q("a"), q("b")];
  assert.deepEqual(engine.selectNext(questions, evaluation(40, "Can you expand?"), 1), {
    kind: "followUp",
    text: "Can you expand?",
  });
});

test("completes after a weak answer to a final follow-up", () => {
  const questions = [q("a"), q("a-fu", { isFollowUp: true })];
  assert.deepEqual(engine.selectNext(questions, evaluation(20, "More?"), 1), { kind: "complete" });
});
