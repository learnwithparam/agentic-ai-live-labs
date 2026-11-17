import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeModel } from "../../src/model";
import { loadRun } from "../../src/runs";
import {
  addStep,
  describeRun,
  openRun,
  runWithRecord,
  STALL_SECONDS,
  whatIsItDoing,
} from "../../labs/19-run-state";

process.env.RUNS_DIR = mkdtempSync(`${tmpdir()}/runs-`);
const model = makeModel();

// PROMISE: every run has a record from its first step, saved after every step.
// A failed run says why. A run that went quiet reads as stalled.
test("the record is on disk after each step, before the run ends", () => {
  const run = openRun("What is the dose of Cardioza?", 1000);
  expect(loadRun(run.id)).toMatchObject({ status: "running", steps: [] });
  addStep(run, "search", "done", "found", 2000);
  expect(loadRun(run.id)?.steps.length).toBe(1);
  expect(loadRun(run.id)?.updatedAt).toBe(2000);
});

test("a finished run reads back done, and a failed run keeps its reason", () => {
  const done = runWithRecord("What is the dose of Cardioza?", "US", model);
  expect(loadRun(done.id)).toMatchObject({ status: "done" });
  expect(loadRun(done.id)?.steps.map((step) => step.name)).toEqual(["search", "answer"]);
  const failed = runWithRecord("Is Zorbex safe for children?", "US", model);
  const record = loadRun(failed.id);
  expect(record?.status).toBe("failed");
  expect(record?.steps[record.steps.length - 1].note).toBe("no approved document");
  expect(whatIsItDoing("R-nothing")).toBe("no run named R-nothing");
});

test("a running record with no news for too long is stalled", () => {
  const run = openRun("What is the dose of Cardioza?", 0);
  expect(describeRun(run, 10_000)).toBe("running: 0 steps so far");
  expect(describeRun(run, (STALL_SECONDS + 1) * 1000)).toContain("stalled");
});
