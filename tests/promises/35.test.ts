import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { readLines } from "../../src/jobs";
import { makeModel, type CallLlm } from "../../src/model";
import { approve, boardOf, wake, wakeNaive, type Plan } from "../../labs/35-wakeups-and-board";

const SWEEP = "Sweep the inbox every weekday at 9am.";
const job = { name: "inbox-sweep", everyHours: 24, question: SWEEP, approval: false };
const daily: Plan = { jobs: [job], events: [] };
const drafts: Plan = { jobs: [{ ...job, approval: true }], events: [] };
const issue = { id: "delivery-9001", question: "Triage issue-103 when GitHub posts it." };
const fresh = () => `${mkdtempSync(`${tmpdir()}/t35-`)}/board.jsonl`;
const ok = makeModel("ok");
const runs = (file: string) => readLines(file).filter((line) => line.status === "running").length;

// PROMISE: a key runs once. A draft waits as a card, and a yes resumes it. A failed run says failed.
test("two wakeups in one day run once, and the next day runs again", () => {
  const file = fresh();
  wake(0, daily, ok, file);
  wake(1, daily, ok, file);
  expect(runs(file)).toBe(1);
  wake(24, daily, ok, file);
  expect(runs(file)).toBe(2);
});

test("a webhook sent twice runs once", () => {
  const file = fresh();
  const plan: Plan = { jobs: [], events: [issue] };
  wake(0, plan, ok, file);
  wake(1, plan, ok, file);
  expect(runs(file)).toBe(1);
  expect(boardOf(file)[0].note).toContain("issue-103");
});

test("without keys the same day runs twice", () => {
  const file = fresh();
  wakeNaive(0, daily, ok, file);
  wakeNaive(1, daily, ok, file);
  expect(runs(file)).toBe(2);
});

test("a finished run is a done card with the result", () => {
  const file = fresh();
  wake(0, daily, ok, file);
  const card = boardOf(file)[0];
  expect(card.status).toBe("done");
  expect(card.note).toContain("Acme contract");
});

test("a failed run is a failed card, not a silent gap", () => {
  const file = fresh();
  const down: CallLlm = () => {
    throw new Error("the model is down");
  };
  wake(0, daily, down, file);
  const card = boardOf(file)[0];
  expect(card.status).toBe("failed");
  expect(card.note).toContain("model is down");
});

test("a card says running before the work starts", () => {
  const file = fresh();
  wake(0, daily, ok, file);
  expect(readLines(file)[0].status).toBe("running");
});

test("a draft waits as a card, and Maya's yes a day later sends it once", () => {
  const file = fresh();
  wake(0, drafts, ok, file);
  expect(boardOf(file)[0].status).toBe("waiting");
  expect(approve(24, "inbox-sweep:0", file)).toBeDefined();
  expect(approve(25, "inbox-sweep:0", file)).toBeUndefined();
  const card = boardOf(file)[0];
  expect(card.status).toBe("done");
  expect(card.note).toContain("sent after Maya said yes");
  expect(runs(file)).toBe(1);
});

test("a yes with no waiting draft does nothing", () => {
  const file = fresh();
  wake(0, daily, ok, file);
  expect(approve(24, "inbox-sweep:0", file)).toBeUndefined();
});
