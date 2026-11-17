import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { answerAlone, answerWithHelper } from "../../labs/32-subagent-isolation";

const ASK = "What is the dose of Cardioza for Dr. Lee?";

// PROMISE: the helper reads the noise. The main agent keeps a short report and checks it.
test("lab 32: the main agent keeps far less than the helper read", () => {
  const done = answerWithHelper(ASK, "H-1", makeModel("ok"));
  expect(done.helperChars).toBeGreaterThan(3000);
  expect(done.mainChars).toBeLessThan(700);
  expect(done.answer).toContain("DOC-101");
});

test("lab 32: with no helper the main agent holds all of it", () => {
  const done = answerAlone(ASK, "H-1", makeModel("ok"));
  expect(done.mainChars).toBeGreaterThan(3000);
});

test("lab 32: a long report is cut to the limit", () => {
  const long = "x ".repeat(3000) + "10mg [DOC-101]";
  const model = () => ({ text: long });
  const done = answerWithHelper(ASK, "H-1", model);
  expect(done.mainChars).toBeLessThan(ASK.length + 401);
});

test("lab 32: a made-up dose in the report is refused", () => {
  const done = answerWithHelper(ASK, "H-1", makeModel("invent"));
  expect(done.answer).toBe("I found no approved answer for this.");
});

test("lab 32: a helper that never finishes sends a short note, not its log", () => {
  const done = answerWithHelper(ASK, "H-1", makeModel("stuck"));
  expect(done.mainChars).toBe(ASK.length + "HELPER_FAILED: no answer.".length);
  expect(done.answer).toBe("I found no approved answer for this.");
});

test("lab 32: no approved document means no answer", () => {
  const done = answerWithHelper("What is the dose of Zorbex for Dr. Lee?", "H-1", makeModel("ok"));
  expect(done.answer).toBe("I found no approved answer for this.");
});
