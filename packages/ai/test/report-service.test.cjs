// Run with node --require tsx/cjs --test packages/ai/test/report-service.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("@interviewiq/db");
const { getReportPayload, verdictForScore } = require("../src/services/report-service");
const { mockCoachingReport } = require("../src/mock/fixtures/report");

/** Stub session.findUnique with a prebuilt row (the service relies on the DB for ordering). */
function stubSession(t, row) {
  const saved = prisma.session;
  const calls = [];
  prisma.session = {
    async findUnique(args) {
      calls.push(args);
      return row;
    },
  };
  t.after(() => {
    prisma.session = saved;
  });
  return calls;
}

function reportRow(overrides = {}) {
  return {
    id: "r1",
    sessionId: "s1",
    overallScore: mockCoachingReport.overallScore,
    technicalScore: 72,
    behavioralScore: 78,
    communicationScore: 82,
    strengths: JSON.stringify(mockCoachingReport.strengths),
    weaknesses: JSON.stringify(mockCoachingReport.areasToImprove),
    studyPlan: JSON.stringify(mockCoachingReport.studyPlan),
    summary: JSON.stringify(mockCoachingReport),
    ...overrides,
  };
}

function question(id, overrides = {}) {
  return {
    id,
    text: `Question ${id}`,
    category: "technical",
    transcript: `Answer ${id}`,
    score: 70,
    feedback: "fine",
    strengths: JSON.stringify(["clear"]),
    gaps: JSON.stringify(["depth"]),
    ...overrides,
  };
}

function note(id, questionId, overrides = {}) {
  return {
    id,
    sessionId: "s1",
    questionId,
    source: "selection",
    selection: null,
    prompt: `prompt ${id}`,
    answer: `answer ${id}`,
    askedBeforeAnswer: false,
    model: "mock",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function sessionRow(overrides = {}) {
  return {
    id: "s1",
    companyName: "Acme",
    jobTitle: "Engineer",
    difficulty: "MID",
    interviewType: "TECHNICAL",
    language: "EN",
    status: "COMPLETED",
    coachEnabled: true,
    report: reportRow(),
    coachNotes: [],
    questions: [question("q1")],
    ...overrides,
  };
}

test("not_found when the session does not exist", async (t) => {
  stubSession(t, null);
  assert.deepEqual(await getReportPayload("missing"), { kind: "not_found" });
});

test("not_ready passes the session status through while there is no report", async (t) => {
  for (const status of ["INTERVIEWING", "WRAPPING_UP"]) {
    stubSession(t, sessionRow({ status, report: null }));
    assert.deepEqual(await getReportPayload("s1"), { kind: "not_ready", status });
  }
});

test("asks the DB for questions in order and coach notes by creation time", async (t) => {
  const calls = stubSession(t, null);
  await getReportPayload("s1");
  assert.deepEqual(calls[0].where, { id: "s1" });
  assert.deepEqual(calls[0].select.questions.orderBy, { order: "asc" });
  assert.deepEqual(calls[0].select.coachNotes.orderBy, { createdAt: "asc" });
});

test("ready with the stored JSON summary and the session view", async (t) => {
  stubSession(t, sessionRow());
  const payload = await getReportPayload("s1");
  assert.equal(payload.kind, "ready");
  assert.deepEqual(payload.report, mockCoachingReport);
  assert.deepEqual(payload.session, {
    id: "s1",
    companyName: "Acme",
    jobTitle: "Engineer",
    difficulty: "MID",
    interviewType: "TECHNICAL",
    language: "EN",
    status: "COMPLETED",
    coachEnabled: true,
  });
});

test("verdict bands", () => {
  assert.equal(verdictForScore(80), "Strong Pass");
  assert.equal(verdictForScore(79), "Lean Pass");
  assert.equal(verdictForScore(65), "Lean Pass");
  assert.equal(verdictForScore(64), "Borderline");
  assert.equal(verdictForScore(50), "Borderline");
  assert.equal(verdictForScore(49), "No Pass");
});

test("a corrupt summary falls back to the report columns", async (t) => {
  for (const [summary, overallScore, verdict] of [
    ["{not json", 85, "Strong Pass"],
    [JSON.stringify({ overallScore: "high" }), 70, "Lean Pass"],
    ["", 55, "Borderline"],
    ["null", 30, "No Pass"],
  ]) {
    stubSession(t, sessionRow({ report: reportRow({ summary, overallScore }) }));
    const { report } = await getReportPayload("s1");
    assert.equal(report.overallScore, overallScore, summary);
    assert.equal(report.verdict, verdict, summary);
    assert.deepEqual(report.dimensionScores, {
      technical: 72,
      problemSolving: Math.round((72 + 82) / 2),
      communication: 82,
      behavioral: 78,
    });
    assert.deepEqual(report.strengths, mockCoachingReport.strengths);
    assert.deepEqual(report.areasToImprove, mockCoachingReport.areasToImprove);
    assert.equal(report.studyPlan.length, mockCoachingReport.studyPlan.length);
  }
});

test("corrupt columns degrade to empty lists instead of throwing", async (t) => {
  stubSession(t, sessionRow({
    report: reportRow({ summary: "x", strengths: "x", weaknesses: "{}", studyPlan: "null" }),
  }));
  const { report } = await getReportPayload("s1");
  assert.deepEqual(report.strengths, []);
  assert.deepEqual(report.areasToImprove, []);
  assert.deepEqual(report.studyPlan, []);
});

test("only answered questions are listed, with a dense order", async (t) => {
  stubSession(t, sessionRow({
    questions: [
      question("q1"),
      question("q2", { transcript: null, score: null }), // skipped
      question("q3", { strengths: "not json", gaps: JSON.stringify([1, "gap"]) }),
      question("q4", { transcript: "" }), // answered with silence still counts
    ],
  }));
  const { questions } = await getReportPayload("s1");
  assert.deepEqual(questions.map((q) => [q.id, q.order]), [["q1", 0], ["q3", 1], ["q4", 2]]);
  assert.deepEqual(questions[0].strengths, ["clear"]);
  assert.deepEqual(questions[1].strengths, []);
  assert.deepEqual(questions[1].gaps, ["gap"]);
});

test("coach notes are grouped per question and flag coaching before the answer", async (t) => {
  stubSession(t, sessionRow({
    questions: [question("q1"), question("q2"), question("q3")],
    coachNotes: [
      note("n1", "q1"),
      note("n2", "q2", { askedBeforeAnswer: true }),
      note("n3", "q1", { selection: "some text" }),
      note("n4", null), // not tied to a question: ignored
      note("n5", "q2"),
    ],
  }));
  const { questions } = await getReportPayload("s1");
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]));

  assert.deepEqual(byId.q1.coachNotes.map((n) => n.id), ["n1", "n3"]);
  assert.equal(byId.q1.coachedBeforeAnswer, false);
  assert.deepEqual(byId.q2.coachNotes.map((n) => n.id), ["n2", "n5"]);
  assert.equal(byId.q2.coachedBeforeAnswer, true);
  assert.deepEqual(byId.q3.coachNotes, []);
  assert.equal(byId.q3.coachedBeforeAnswer, false);

  assert.deepEqual(byId.q1.coachNotes[1], {
    id: "n3",
    questionId: "q1",
    source: "selection",
    selection: "some text",
    prompt: "prompt n3",
    answer: "answer n3",
    askedBeforeAnswer: false,
    model: "mock",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
});

function planWithUrls(urls) {
  return [{
    ...mockCoachingReport.studyPlan[0],
    resources: urls.map((url, i) => ({ type: "article", title: `r${i}`, url })),
  }];
}

const UNSAFE_URLS = [
  "http://example.com/a",
  "javascript:alert(1)",
  "not a url",
  "data:text/html,hi",
  42,
];

test("non-https resource URLs in the stored summary become null", async (t) => {
  const summary = { ...mockCoachingReport, studyPlan: planWithUrls(["https://ok.example/a", ...UNSAFE_URLS]) };
  stubSession(t, sessionRow({ report: reportRow({ summary: JSON.stringify(summary) }) }));
  const { report } = await getReportPayload("s1");
  // The summary is kept (not discarded for the column fallback) ...
  assert.equal(report.executiveSummary, mockCoachingReport.executiveSummary);
  // ... with only the https link surviving.
  assert.deepEqual(
    report.studyPlan[0].resources.map((r) => r.url),
    ["https://ok.example/a", null, null, null, null, null],
  );
});

test("non-https resource URLs in the column fallback become null", async (t) => {
  stubSession(t, sessionRow({
    report: reportRow({
      summary: "corrupt",
      studyPlan: JSON.stringify(planWithUrls(["https://ok.example/b", ...UNSAFE_URLS])),
    }),
  }));
  const { report } = await getReportPayload("s1");
  assert.equal(report.verdict, verdictForScore(mockCoachingReport.overallScore));
  assert.deepEqual(
    report.studyPlan[0].resources.map((r) => r.url),
    ["https://ok.example/b", null, null, null, null, null],
  );
});
