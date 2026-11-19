// Run with: node --require tsx/cjs --test test/*.test.cjs (from apps/web)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  phaseReducer,
  initialMachineState,
  canPause,
  canPlay,
  canRecord,
} = require("../lib/interview/phase-machine");

/** Feed events through the reducer, left to right. */
const run = (events, state = initialMachineState) => events.reduce(phaseReducer, state);

const question = (questionId, overrides = {}) => ({
  type: "question_ready",
  data: {
    questionId,
    text: `Question ${questionId}`,
    category: "technical",
    order: 1,
    total: 5,
    stage: null,
    isFollowUp: false,
    ...overrides,
  },
});
const audio = (questionId) => ({
  type: "audio_ready",
  data: { questionId, audioUrl: `/api/audio/${questionId}` },
});
const transition = { type: "transition_text", data: { message: "Thanks, next one." } };
const serverError = (code) => ({ type: "error", data: { code, retryable: true } });
const stageTransition = (completedStage, transitionAudioUrl) => ({
  type: "stage_transition",
  data: { completedStage, stageScore: 72, nextStage: "BEHAVIORAL", transitionAudioUrl },
});
const complete = {
  type: "interview_complete",
  data: { sessionId: "s1", redirectTo: "/report/s1" },
};
// The machine stores errors opaquely; any object stands in for a UiError.
const failure = { code: "NETWORK" };

/** A state with question q1 answerable and its audio ready. */
const ready = () => run([question("q1"), audio("q1")]);

test("starts loading and becomes ready when the first question arrives", () => {
  assert.equal(initialMachineState.phase, "loading");
  const state = run([question("q1")]);
  assert.equal(state.phase, "ready");
  assert.equal(state.questionId, "q1");
  assert.equal(canRecord(state), true, "a written question is answerable before its audio");
  assert.equal(canPlay(state), false, "nothing to play until audio_ready");
});

test("full answer loop: play → ready → record → submit → processing → transition → next question", () => {
  let state = ready();
  assert.equal(canPlay(state), true);

  state = phaseReducer(state, { type: "PLAY" });
  assert.equal(state.phase, "speaking");
  state = phaseReducer(state, { type: "PLAYBACK_ENDED" });
  assert.equal(state.phase, "ready");

  state = phaseReducer(state, { type: "RECORD" });
  assert.equal(state.phase, "starting_recording");
  state = phaseReducer(state, { type: "RECORD_STARTED" });
  assert.equal(state.phase, "recording");

  state = phaseReducer(state, { type: "STOP_RECORDING" });
  assert.equal(state.phase, "processing");
  state = phaseReducer(state, { type: "SUBMIT" });
  assert.equal(state.phase, "processing");
  assert.equal(state.lastAction, "submit");

  state = phaseReducer(state, transition);
  assert.equal(state.phase, "transition");

  state = run([question("q2"), audio("q2")], state);
  assert.equal(state.phase, "ready");
  assert.equal(state.questionId, "q2");
  assert.equal(canPlay(state), true);
});

test("audio for another question does not enable play", () => {
  const state = run([question("q1"), audio("q0")]);
  assert.equal(canPlay(state), false);
});

test("a replayed question (reconnect) keeps the phase and waits for fresh audio", () => {
  let state = run([{ type: "RECORD" }, { type: "RECORD_STARTED" }], ready());
  assert.equal(state.phase, "recording");
  state = phaseReducer(state, question("q1"));
  assert.equal(state.phase, "recording");
  assert.equal(state.audioReady, false);
});

test("transition text outside processing is ignored", () => {
  const state = phaseReducer(ready(), transition);
  assert.equal(state.phase, "ready");
});

test("stage transition shows the card and queues its narration before the next question", () => {
  let state = run(
    [{ type: "RECORD" }, { type: "RECORD_STARTED" }, { type: "STOP_RECORDING" }, transition],
    ready(),
  );
  state = phaseReducer(state, stageTransition("TECHNICAL", "/api/audio/narration"));
  assert.equal(state.phase, "stage_transition");
  assert.equal(state.pendingNarration, "/api/audio/narration");
  assert.equal(canPause(state), true);

  state = run([question("q2", { stage: "BEHAVIORAL" }), audio("q2")], state);
  assert.equal(state.phase, "ready");
  assert.equal(state.pendingNarration, null);
  assert.equal(
    state.questionNarration,
    "/api/audio/narration",
    "narration rides with the next question",
  );

  state = phaseReducer(state, { type: "PLAY" });
  assert.equal(state.questionNarration, null, "narration plays once");
});

test("the opening stage intro (no completed stage) does not interrupt", () => {
  const state = phaseReducer(ready(), stageTransition(null, null));
  assert.equal(state.phase, "ready");
  assert.equal(state.pendingNarration, null);
});

test("pause blocks play and record; resume restores them", () => {
  let state = phaseReducer(ready(), { type: "PAUSE" });
  assert.equal(state.paused, true);
  assert.equal(canPlay(state), false);
  assert.equal(canRecord(state), false);
  assert.equal(phaseReducer(state, { type: "PLAY" }), state, "PLAY is ignored while paused");
  assert.equal(phaseReducer(state, { type: "RECORD" }), state, "RECORD is ignored while paused");

  state = phaseReducer(state, { type: "RESUME" });
  assert.equal(state.paused, false);
  assert.equal(canRecord(state), true);
});

test("pause is not allowed while recording or processing", () => {
  const recording = run([{ type: "RECORD" }, { type: "RECORD_STARTED" }], ready());
  assert.equal(canPause(recording), false);
  assert.equal(phaseReducer(recording, { type: "PAUSE" }).paused, false);

  const processing = phaseReducer(recording, { type: "STOP_RECORDING" });
  assert.equal(phaseReducer(processing, { type: "PAUSE" }).paused, false);
});

test("opening the coach pauses; resuming closes it", () => {
  let state = phaseReducer(ready(), { type: "OPEN_COACH" });
  assert.equal(state.paused, true);
  assert.equal(state.coachOpen, true);
  state = phaseReducer(state, { type: "CLOSE_COACH" });
  assert.equal(state.coachOpen, false);
  assert.equal(state.paused, true, "closing the drawer keeps the hold");
  state = run([{ type: "OPEN_COACH" }, { type: "RESUME" }], state);
  assert.equal(state.coachOpen, false);
  assert.equal(state.paused, false);
});

test("a server error during processing returns to ready", () => {
  const processing = run(
    [{ type: "RECORD" }, { type: "RECORD_STARTED" }, { type: "STOP_RECORDING" }],
    ready(),
  );
  assert.equal(phaseReducer(processing, serverError("ANSWER_FAILED")).phase, "ready");
});

test("missing audio does not abort processing", () => {
  const processing = run(
    [{ type: "RECORD" }, { type: "RECORD_STARTED" }, { type: "STOP_RECORDING" }],
    ready(),
  );
  assert.equal(phaseReducer(processing, serverError("AUDIO_UNAVAILABLE")).phase, "processing");
});

test("a failed upload returns to ready with the submit alert; retrying clears it", () => {
  let state = run(
    [
      { type: "RECORD" },
      { type: "RECORD_STARTED" },
      { type: "STOP_RECORDING" },
      { type: "SUBMIT" },
    ],
    ready(),
  );
  state = phaseReducer(state, { type: "SUBMIT_FAILED", error: failure });
  assert.equal(state.phase, "ready");
  assert.equal(state.errors.submit, failure);

  state = phaseReducer(state, { type: "SUBMIT" });
  assert.equal(state.phase, "processing");
  assert.equal(state.errors.submit, null);
});

test("a recording failure returns to ready; starting again clears record and submit alerts", () => {
  let state = run([{ type: "RECORD" }, { type: "RECORD_FAILED", error: failure }], ready());
  assert.equal(state.phase, "ready");
  assert.equal(state.errors.record, failure);
  state = phaseReducer(state, { type: "RECORD" });
  assert.equal(state.errors.record, null);
  assert.equal(state.errors.submit, null);
});

test("start request lifecycle tracks starting and the start alert", () => {
  let state = phaseReducer(initialMachineState, { type: "START_REQUESTED" });
  assert.equal(state.starting, true);
  assert.equal(state.lastAction, "start");
  state = phaseReducer(state, { type: "START_FAILED", error: failure });
  assert.equal(state.starting, false);
  assert.equal(state.errors.start, failure);
  state = phaseReducer(state, { type: "START_REQUESTED" });
  assert.equal(state.errors.start, null);
});

test("a failed stop request restores an answerable state", () => {
  let state = run(
    [{ type: "RECORD" }, { type: "RECORD_STARTED" }, { type: "STOP_INTERVIEW" }],
    ready(),
  );
  assert.equal(state.stopping, true);
  assert.equal(phaseReducer(state, { type: "STOP_INTERVIEW" }), state, "a second stop is ignored");
  state = phaseReducer(state, { type: "STOP_FAILED", error: failure });
  assert.equal(state.stopping, false);
  assert.equal(state.phase, "ready");
  assert.equal(state.errors.stop, failure);
});

test("completion is terminal", () => {
  let state = phaseReducer(ready(), complete);
  assert.equal(state.phase, "complete");
  state = run([question("q9"), transition, serverError("INTERNAL_ERROR")], state);
  assert.equal(state.phase, "complete");
  assert.equal(phaseReducer(state, { type: "STOP_INTERVIEW" }).stopping, false);
});

test("the reducer never mutates its input", () => {
  const before = ready();
  const snapshot = JSON.stringify(before);
  run(
    [{ type: "PLAY" }, { type: "PAUSE" }, { type: "SUBMIT_FAILED", error: failure }, complete],
    before,
  );
  assert.equal(JSON.stringify(before), snapshot);
});
