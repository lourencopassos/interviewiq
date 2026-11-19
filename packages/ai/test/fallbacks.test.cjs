// Run with node --require tsx/cjs --test packages/ai/test/fallbacks.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Language, InterviewStage } = require("@interviewiq/types");
const { fallbacksFor } = require("../src/i18n/fallbacks");
const { getMockStageTransition } = require("../src/mock/fixtures/stage-transition");

test("every interview language has a complete fallback table", () => {
  const english = fallbacksFor("EN");
  for (const language of Object.values(Language)) {
    const table = fallbacksFor(language);
    assert.deepEqual(Object.keys(table).sort(), Object.keys(english).sort(), language);
    assert.deepEqual(Object.keys(table.stageNames).sort(), Object.values(InterviewStage).sort(), language);
    for (const value of [table.opening, table.closing, table.evaluatorFeedback, ...Object.values(table.report)]) {
      assert.ok(value.length > 0, language);
    }
  }
});

test("non-English fallbacks are actually translated", () => {
  for (const language of ["PT_BR", "ES"]) {
    const table = fallbacksFor(language);
    assert.notEqual(table.closing, fallbacksFor("EN").closing, language);
    assert.notEqual(table.evaluatorFeedback, fallbacksFor("EN").evaluatorFeedback, language);
  }
});

test("unknown languages fall back to English", () => {
  assert.equal(fallbacksFor(undefined), fallbacksFor("EN"));
  assert.equal(fallbacksFor("FR"), fallbacksFor("EN"));
});

test("the narrator fallback names both stages in the session language", () => {
  const es = fallbacksFor("ES");
  const text = es.stageTransition(es.stageNames.PHONE_SCREEN, es.stageNames.TECHNICAL);
  assert.match(text, /Entrevista telefónica/);
  assert.match(text, /Profundización técnica/);
});

test("mock stage transitions are picked per stage pair", () => {
  assert.notEqual(getMockStageTransition("PHONE_SCREEN", "TECHNICAL"), getMockStageTransition("TECHNICAL", "BEHAVIORAL"));
  assert.equal(getMockStageTransition("SYSTEM_DESIGN", "PHONE_SCREEN"), getMockStageTransition());
});
