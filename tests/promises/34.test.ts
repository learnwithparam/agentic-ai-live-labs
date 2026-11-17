import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { appendLine, readLines } from "../../src/jobs";
import { makeModel } from "../../src/model";
import { answerShared, answerSharedNaive } from "../../labs/34-shared-memory";

const ASK = "What is the dose of Cardioza for Dr. Lee?";
const ASK_DE = "What is the dose of Cardioza for Dr. Weber?";
const fresh = () => `${mkdtempSync(`${tmpdir()}/t34-`)}/memory.jsonl`;
const ok = makeModel("ok");

// PROMISE: only a checked fact is saved. A bot reads facts for its country, while the document agrees.
test("a checked fact is saved and the next bot reuses it", () => {
  const file = fresh();
  const one = answerShared(ASK, "H-1", ok, { file, bot: "answer bot" });
  const two = answerShared(ASK, "H-1", ok, { file, bot: "outreach bot" });
  expect(one.saved).toBe(true);
  expect(two.from).toBe("memory");
  expect(readLines(file)[0].by).toBe("answer bot");
});

test("a made-up dose is not saved", () => {
  const file = fresh();
  const one = answerShared(ASK, "H-1", makeModel("invent"), { file, bot: "answer bot" });
  expect(one.saved).toBe(false);
  expect(readLines(file).length).toBe(0);
});

test("without the check, a made-up dose is saved and repeated", () => {
  const file = fresh();
  answerSharedNaive(ASK, "H-1", makeModel("invent"), { file, bot: "answer bot" });
  const two = answerSharedNaive(ASK, "H-1", ok, { file, bot: "outreach bot" });
  expect(two.answer).toContain("20mg");
});

test("a fact for the US is not used in Germany", () => {
  const file = fresh();
  answerShared(ASK, "H-1", ok, { file, bot: "answer bot" });
  const two = answerShared(ASK_DE, "H-2", ok, { file, bot: "outreach bot" });
  expect(two.from).toBe("docs");
  expect(two.answer).toContain("DOC-102");
});

test("a fact the approved document no longer agrees with is ignored", () => {
  const file = fresh();
  const old = "Cardioza standard adult dose is 8mg once daily. [DOC-101]";
  appendLine(file, { drug: "Cardioza", country: "US", text: old, by: "old bot" });
  const one = answerShared(ASK, "H-1", ok, { file, bot: "answer bot" });
  expect(one.from).toBe("docs");
  expect(one.answer).toContain("10mg");
});

test("a question about no approved drug saves nothing", () => {
  const file = fresh();
  const one = answerShared("What is the dose of Zorbex for Dr. Lee?", "H-1", ok, { file, bot: "a" });
  expect(one.saved).toBe(false);
  expect(readLines(file).length).toBe(0);
});
