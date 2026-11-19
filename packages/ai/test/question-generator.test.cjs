// Run with node --require tsx/cjs --test packages/ai/test/question-generator.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Messages } = require("@anthropic-ai/sdk/resources/messages");
const { generateQuestionSet } = require("../src/prompts/question-generator");
const { mockQuestionSet } = require("../src/mock/fixtures/question-set");

const params = {
  companyName: "Example",
  jobTitle: "Engineer",
  difficulty: "MID",
  interviewType: "TECHNICAL",
  parsedJob: {},
  companyIntel: null,
};

function mockQuestions(t, responses) {
  return t.mock.method(Messages.prototype, "create", async ({ tools }) => ({
    stop_reason: "tool_use",
    content: [{
      type: "tool_use",
      name: tools[0].name,
      input: { ...mockQuestionSet, questions: responses.shift() },
    }],
  }));
}

test("accepts a JSON-encoded questions array without another model call", async (t) => {
  const model = mockQuestions(t, [JSON.stringify(mockQuestionSet.questions)]);
  assert.deepEqual(await generateQuestionSet(params), mockQuestionSet);
  assert.equal(model.mock.callCount(), 1);
});

test("regenerates once if the questions string cannot be decoded", async (t) => {
  const model = mockQuestions(t, ["invalid JSON", mockQuestionSet.questions]);
  assert.deepEqual(await generateQuestionSet(params), mockQuestionSet);
  assert.equal(model.mock.callCount(), 2);
});

test("rejects invalid question objects even inside an encoded array", async (t) => {
  const model = mockQuestions(t, ['[{}]', '[{}]']);
  await assert.rejects(generateQuestionSet(params), { name: "ZodError" });
  assert.equal(model.mock.callCount(), 2);
});
