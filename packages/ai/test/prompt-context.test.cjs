// Run with node --require tsx/cjs --test packages/ai/test/prompt-context.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildPromptContext } = require("../src/interview/prompt-context");
const { mockParsedJob } = require("../src/mock/fixtures/parsed-job");
const { mockCompanyIntel } = require("../src/mock/fixtures/company-intel");

function session(overrides = {}) {
  return {
    companyName: "Acme",
    jobTitle: "Frontend Engineer",
    difficulty: "SENIOR",
    interviewType: "FULL_LOOP",
    language: "PT_BR",
    resumeText: "CV",
    parsedJob: JSON.stringify(mockParsedJob),
    companyIntel: JSON.stringify(mockCompanyIntel),
    ...overrides,
  };
}

test("carries the session fields every prompt needs and parses the stored JSON", () => {
  const ctx = buildPromptContext(session());
  assert.deepEqual(
    {
      companyName: ctx.companyName,
      jobTitle: ctx.jobTitle,
      difficulty: ctx.difficulty,
      interviewType: ctx.interviewType,
      language: ctx.language,
      resumeText: ctx.resumeText,
    },
    {
      companyName: "Acme",
      jobTitle: "Frontend Engineer",
      difficulty: "SENIOR",
      interviewType: "FULL_LOOP",
      language: "PT_BR",
      resumeText: "CV",
    },
  );
  assert.deepEqual(ctx.parsedJob, mockParsedJob);
  assert.deepEqual(ctx.companyIntel, mockCompanyIntel);
});

test("missing or corrupt job JSON falls back to a job built from the session", () => {
  for (const parsedJob of [null, "{not json", JSON.stringify({ jobTitle: 1 })]) {
    const ctx = buildPromptContext(session({ parsedJob }));
    assert.equal(ctx.parsedJob.jobTitle, "Frontend Engineer");
    assert.equal(ctx.parsedJob.companyName, "Acme");
    assert.deepEqual(ctx.parsedJob.primarySkills, []);
  }
});

test("missing or corrupt company intel becomes null", () => {
  for (const companyIntel of [null, "{not json", JSON.stringify({ techStack: "nope" })]) {
    assert.equal(buildPromptContext(session({ companyIntel })).companyIntel, null);
  }
});
