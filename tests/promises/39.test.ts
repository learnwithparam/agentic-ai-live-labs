import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeModel } from "../../src/model";
import { answerChecked, answerNaive, withdraw, withdrawnIds } from "../../labs/39-revocation";

const ok = makeModel("ok");
const ASK = "What is the dose of Cardioza for Dr. Lee?";
const fresh = () => mkdtempSync(`${tmpdir()}/t39-`);

// PROMISE: a withdrawn document is never sent, from the cache or from a fresh answer.
// A US answer never reaches Germany.
test("the second ask comes from the cache while the document is approved", () => {
  const dir = fresh();
  expect(answerChecked(ASK, "US", ok, dir).source).toBe("fresh");
  const second = answerChecked(ASK, "US", ok, dir);
  expect(second.source).toBe("cache");
  expect(second.answer).toContain("10mg");
});

test("a withdrawn document is never served from the cache", () => {
  const dir = fresh();
  answerChecked(ASK, "US", ok, dir);
  withdraw(dir, "DOC-101", "The label changed.");
  const second = answerChecked(ASK, "US", ok, dir);
  expect(second.answer).not.toContain("10mg");
  expect(second.answer).not.toContain("DOC-101");
  expect(second.source).toBe("none");
});

test("a withdrawal for another country leaves the saved answer alone", () => {
  const dir = fresh();
  answerChecked(ASK, "US", ok, dir);
  withdraw(dir, "DOC-102", "The label changed.");
  expect(answerChecked(ASK, "US", ok, dir).source).toBe("cache");
});

test("a document withdrawn during the run is caught before the send", () => {
  const dir = fresh();
  const hook = () => withdraw(dir, "DOC-101", "The label changed.");
  const result = answerChecked(ASK, "US", ok, dir, hook);
  expect(result.source).toBe("blocked");
  expect(result.answer).not.toContain("10mg");
  const again = answerChecked(ASK, "US", ok, dir);
  expect(again.answer).not.toContain("10mg");
});

test("a US answer in the cache is never given to a German doctor", () => {
  const dir = fresh();
  answerChecked(ASK, "US", ok, dir);
  const german = answerChecked(ASK, "DE", ok, dir);
  expect(german.answer).toContain("5mg");
  expect(german.answer).not.toContain("10mg");
});

test("the withdrawal stays in the list with its reason", () => {
  const dir = fresh();
  withdraw(dir, "DOC-101", "The label changed.");
  expect(withdrawnIds(dir)).toEqual(["DOC-101"]);
});

test("the naive cache serves the withdrawn dose", () => {
  const dir = fresh();
  answerNaive(ASK, "US", ok, dir);
  withdraw(dir, "DOC-101", "The label changed.");
  expect(answerNaive(ASK, "US", ok, dir).answer).toContain("10mg");
});
