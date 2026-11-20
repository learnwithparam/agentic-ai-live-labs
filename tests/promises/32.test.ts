import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { allLogs } from "../../src/juniper";
import { answerAlone, answerWithHelper, reportProblems } from "../../labs/32-subagent-isolation";

const ASK = "Which builds failed this week, and why?";
const NO_ANSWER = "I found no checked answer for this.";

// PROMISE: the helper reads the noise. The main agent keeps a short report and checks it.
test("the main agent keeps far less than the helper read", () => {
  const done = answerWithHelper(ASK, makeModel("ok"));
  expect(done.helperChars).toBeGreaterThan(8000);
  expect(done.mainChars).toBeLessThan(700);
  expect(done.answer).toContain("build-17: FAIL");
  expect(done.answer.split("\n").length).toBe(3);
});

test("with no helper the main agent holds all of it", () => {
  const done = answerAlone(ASK, makeModel("ok"));
  expect(done.mainChars).toBeGreaterThan(8000);
});

test("a long report is cut to the limit", () => {
  const model = () => ({ text: "build-2: FAIL ".repeat(200) });
  const done = answerWithHelper(ASK, model);
  expect(done.mainChars).toBeLessThan(ASK.length + 401);
});

test("a made-up build in the report is refused", () => {
  const done = answerWithHelper(ASK, makeModel("invent"));
  expect(done.answer).toBe(NO_ANSWER);
});

test("a helper that never finishes sends a short note, not its log", () => {
  const done = answerWithHelper(ASK, makeModel("stuck"));
  expect(done.mainChars).toBe(ASK.length + "HELPER_FAILED: no answer.".length);
  expect(done.answer).toBe(NO_ANSWER);
});

test("a report line must name a log that really failed", () => {
  const logs = allLogs();
  expect(reportProblems("build-2: FAIL: x", logs)).toEqual([]);
  expect(reportProblems("build-1: FAIL: x", logs).length).toBe(1);
  expect(reportProblems("build-99: FAIL: x", logs).length).toBe(1);
});
