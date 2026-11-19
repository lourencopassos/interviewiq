// Run with node --require tsx/cjs --test packages/ai/test/question-repository.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { installFakePrisma } = require("./fake-prisma.cjs");
const { QuestionRepository, toRuntimeQuestion } = require("../src/interview/question-repository");
const { mockQuestionSet } = require("../src/mock/fixtures/question-set");

const SESSION = "sess_repo";

async function seeded(t, stages = []) {
  const store = installFakePrisma(t);
  const repo = new QuestionRepository(SESSION, "EN");
  await repo.insertAll(mockQuestionSet.questions.slice(0, 4).map((question, i) => ({ question, stage: stages[i] })));
  return { store, repo };
}

test("insertAll numbers questions densely from 0 and keeps the generated metadata", async (t) => {
  const { repo } = await seeded(t);
  const rows = await repo.load();
  assert.deepEqual(rows.map((q) => q.order), [0, 1, 2, 3]);
  assert.equal(rows[0].text, mockQuestionSet.questions[0].text);
  assert.equal(rows[0].targetSkill, mockQuestionSet.questions[0].targetSkill);
  assert.equal(rows[0].isFollowUp, false);
  assert.equal(rows[0].stage, null);
});

test("insertFollowUp lands right after its parent and shifts later rows by one", async (t) => {
  const { repo } = await seeded(t, ["TECHNICAL", "TECHNICAL", "BEHAVIORAL", "BEHAVIORAL"]);
  const before = await repo.load();

  await repo.insertFollowUp(before[1], "Why that index?");
  const after = await repo.load();

  assert.deepEqual(after.map((q) => q.order), [0, 1, 2, 3, 4]);
  assert.deepEqual(
    after.filter((q) => !q.isFollowUp).map((q) => q.id),
    before.map((q) => q.id),
    "original questions keep their relative order",
  );
  const followUp = after[2];
  assert.equal(followUp.text, "Why that index?");
  assert.equal(followUp.isFollowUp, true);
  assert.equal(followUp.stage, "TECHNICAL", "inherits the parent's stage");
  assert.equal(followUp.category, before[1].category);
  assert.equal(followUp.targetSkill, before[1].targetSkill);
  assert.deepEqual(followUp.scoringGuide, before[1].scoringGuide);
});

test("insertFollowUp after the last question appends it", async (t) => {
  const { repo } = await seeded(t);
  const before = await repo.load();
  await repo.insertFollowUp(before[3], "And then?");
  const after = await repo.load();
  assert.equal(after.length, 5);
  assert.equal(after[4].text, "And then?");
  assert.equal(after[4].order, 4);
});

test("recordAnswer persists transcript, score and the evaluation lists", async (t) => {
  const { repo } = await seeded(t);
  const [first] = await repo.load();
  await repo.recordAnswer(first.id, "my answer", {
    score: 81,
    tier: "good",
    shortFeedback: "Nice.",
    followUpNeeded: false,
    followUp: null,
    keyStrengths: ["clear"],
    gaps: ["depth"],
  });
  const [reloaded] = await repo.load();
  assert.equal(reloaded.transcript, "my answer");
  assert.equal(reloaded.score, 81);
  assert.deepEqual(reloaded.strengths, ["clear"]);
  assert.deepEqual(reloaded.gaps, ["depth"]);
});

test("toRuntimeQuestion fills missing metadata with defaults in the session language", () => {
  const row = {
    id: "q1",
    order: 0,
    text: "Hola",
    category: "technical",
    stage: null,
    metadata: "{corrupt",
    score: null,
    transcript: null,
    strengths: null,
    gaps: "[1, \"gap\"]",
  };
  const q = toRuntimeQuestion(row, "ES");
  assert.equal(q.difficulty, 3);
  assert.equal(q.targetSkill, "general");
  assert.equal(q.isFollowUp, false);
  assert.equal(q.scoringGuide.good, "Respuesta sólida");
  assert.deepEqual(q.strengths, []);
  assert.deepEqual(q.gaps, ["gap"]);
});
