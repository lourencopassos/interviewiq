// Run with node --require tsx/cjs --test packages/ai/test/events.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { interviewEventSchema, ERROR_CODES } = require("@interviewiq/types");
const { events } = require("../src/interview/events");
const { AppError, MissingApiKeyError, toAppError } = require("../src/errors");

const question = {
  id: "q1",
  order: 0,
  text: "Tell me about yourself.",
  category: "behavioral",
  stage: "PHONE_SCREEN",
  difficulty: 2,
  targetSkill: "communication",
  scoringGuide: { poor: "p", good: "g", excellent: "e" },
  isFollowUp: false,
  score: null,
  transcript: null,
  strengths: [],
  gaps: [],
};

const evaluation = {
  score: 72,
  tier: "good",
  shortFeedback: "Good.",
  followUpNeeded: false,
  followUp: null,
  keyStrengths: [],
  gaps: [],
};

const stream = { id: "s1", offer: { type: "offer", sdp: "v=0" }, iceServers: [{ urls: "stun:x" }], presenterUrl: "https://x/p.jpg" };

/** One instance of every builder, so a new event type without a builder or schema entry fails here. */
const built = [
  events.stateChange("INTERVIEWING"),
  events.questionReady(question, 0, 6),
  events.audioReady("q1", "/api/audio/abc"),
  events.transcription("q1", "hello"),
  events.evaluation("q1", evaluation),
  events.transitionText("Thanks."),
  events.stageIntro("TECHNICAL"),
  events.stageTransition("PHONE_SCREEN", 70, "TECHNICAL", "/api/audio/def"),
  events.complete("sess1"),
  events.avatarReady("sess1", stream),
  events.avatarAudio("q1"),
  events.avatarFailed("AVATAR_QUOTA"),
  events.error(new AppError("AUDIO_UNAVAILABLE")),
];

test("every builder produces a payload the client schema accepts", () => {
  for (const event of built) {
    const result = interviewEventSchema.safeParse(event);
    assert.ok(result.success, `${event.type}: ${result.success ? "" : result.error.message}`);
    assert.deepEqual(result.data, event, `${event.type} round-trips unchanged`);
  }
  const covered = new Set(built.map((e) => e.type));
  for (const option of interviewEventSchema.options) {
    assert.ok(covered.has(option.shape.type.value), `no builder covers ${option.shape.type.value}`);
  }
});

test("questionReady is 1-based and carries stage and follow-up flag", () => {
  assert.deepEqual(events.questionReady({ ...question, isFollowUp: true }, 2, 7).data, {
    questionId: "q1",
    text: question.text,
    category: "behavioral",
    order: 3,
    total: 7,
    stage: "PHONE_SCREEN",
    isFollowUp: true,
  });
});

test("stage events send enums; the intro has no completed stage or audio", () => {
  assert.deepEqual(events.stageIntro("BEHAVIORAL").data, {
    completedStage: null,
    stageScore: 0,
    nextStage: "BEHAVIORAL",
    transitionAudioUrl: null,
  });
  assert.equal(interviewEventSchema.safeParse({
    type: "stage_transition",
    data: { completedStage: "Phone Screen", stageScore: 1, nextStage: "Technical Deep Dive", transitionAudioUrl: "" },
  }).success, false, "English labels are no longer valid");
});

test("error events carry the code and retry hint, never the cause", () => {
  const error = toAppError(new Error("ElevenLabs 500: secret provider body"), "START_FAILED");
  const event = events.error(error);
  assert.deepEqual(event.data, {
    code: "START_FAILED",
    retryable: true,
    message: "Failed to start the interview. Please try again.",
  });
  assert.doesNotMatch(JSON.stringify(event), /secret/);
  assert.equal(events.error(new MissingApiKeyError("openai")).data.retryable, false);
});

test("the schema rejects unknown error codes and event types", () => {
  assert.equal(interviewEventSchema.safeParse({ type: "error", data: { code: "WHATEVER", retryable: true } }).success, false);
  assert.equal(interviewEventSchema.safeParse({ type: "nope", data: {} }).success, false);
  assert.ok(ERROR_CODES.includes("AUDIO_UNAVAILABLE"));
});
