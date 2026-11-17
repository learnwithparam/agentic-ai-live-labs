import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { readLines } from "../../src/jobs";
import { makeModel, type CallLlm } from "../../src/model";
import { boardOf, wake, wakeNaive, type Plan } from "../../labs/35-wakeups-and-board";

const ASK = "Check the Cardioza dose for Dr. Lee every day.";
const job = { name: "daily", everyHours: 24, hcpId: "H-1", question: ASK };
const daily: Plan = { jobs: [job], events: [] };
const label = { id: "label-7", hcpId: "H-1", question: ASK };
const fresh = () => `${mkdtempSync(`${tmpdir()}/t35-`)}/board.jsonl`;
const ok = makeModel("ok");
const runs = (file: string) => readLines(file).filter((line) => line.status === "running").length;

// PROMISE: a key runs once. Every run is a card, and a failed run says failed.
test("lab 35: two wakeups in one day run once, and the next day runs again", () => {
  const file = fresh();
  wake(0, daily, ok, file);
  wake(5, daily, ok, file);
  expect(runs(file)).toBe(1);
  wake(25, daily, ok, file);
  expect(runs(file)).toBe(2);
});

test("lab 35: a webhook sent twice runs once", () => {
  const file = fresh();
  const plan: Plan = { jobs: [], events: [label] };
  wake(0, plan, ok, file);
  wake(1, plan, ok, file);
  expect(runs(file)).toBe(1);
});

test("lab 35: without keys the same day runs twice", () => {
  const file = fresh();
  wakeNaive(0, daily, ok, file);
  wakeNaive(5, daily, ok, file);
  expect(runs(file)).toBe(2);
});

test("lab 35: a finished run is a done card with the answer", () => {
  const file = fresh();
  wake(0, daily, ok, file);
  const card = boardOf(file)[0];
  expect(card.status).toBe("done");
  expect(card.note).toContain("DOC-101");
});

test("lab 35: a failed run is a failed card, not a silent gap", () => {
  const file = fresh();
  const down: CallLlm = () => {
    throw new Error("the model is down");
  };
  wake(0, daily, down, file);
  const card = boardOf(file)[0];
  expect(card.status).toBe("failed");
  expect(card.note).toContain("model is down");
});

test("lab 35: a card says running before the work starts", () => {
  const file = fresh();
  wake(0, daily, ok, file);
  expect(readLines(file)[0].status).toBe("running");
});
