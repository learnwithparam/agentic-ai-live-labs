import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeModel } from "../../src/model";
import { loadRun } from "../../src/runs";
import { pickApplicants } from "../../src/screening";
import { naiveScreen } from "../../show/19-run-state";
import { describeRun, MOST_FAILS, screenRun, STALL_SECONDS, whatIsItDoing } from "../../labs/19-run-state";
import { openRun } from "../../src/screening";

process.env.RUNS_DIR = mkdtempSync(`${tmpdir()}/runs-`);
const model = makeModel();
const TASK = "Screen the applicants.";

// PROMISE: every run has a record, saved after every try. A restart picks up where it stopped.
// Two fails on one applicant stop the run. A run that went quiet reads as stalled.
test("the record is on disk after each try, even if the program dies", () => {
  const list = pickApplicants(1, 30);
  const first = screenRun(TASK, list, model, "", 12);
  expect(first.calls).toBe(12);
  const saved = loadRun(first.run.id);
  expect(saved?.status).toBe("running");
  expect(Object.keys(saved?.results || {}).length).toBe(12);
});

test("a restart screens only the applicants left, and naive screens them twice", () => {
  const list = pickApplicants(1, 30);
  const first = screenRun(TASK, list, model, "", 12);
  const second = screenRun(TASK, list, model, first.run.id);
  expect(second.calls).toBe(18);
  expect(second.run.status).toBe("done");
  expect(naiveScreen(list, model, 12)).toEqual([12, 30]);
});

test("a busy service is tried again, and two fails stop the run", () => {
  const busy = screenRun(TASK, pickApplicants(71, 10), model);
  expect(busy.run.status).toBe("done");
  expect(busy.run.results["applicant-077"].tries).toBe(2);
  const broken = screenRun(TASK, pickApplicants(1, 120), model);
  expect(broken.run).toMatchObject({ status: "needs-person", reason: "applicant-040 failed twice" });
  expect(broken.run.results["applicant-040"].tries).toBe(MOST_FAILS);
  expect(whatIsItDoing(broken.run.id)).toBe("needs a person: applicant-040 failed twice");
  expect(whatIsItDoing("R-nothing")).toBe("no run named R-nothing");
});

test("a running record with no news for too long is stalled", () => {
  const run = openRun(TASK, 120, 0);
  expect(describeRun(run, 10_000)).toBe("running: 0 of 120 done");
  expect(describeRun(run, (STALL_SECONDS + 1) * 1000)).toContain("stalled");
});
