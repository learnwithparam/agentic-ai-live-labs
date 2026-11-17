import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeModel } from "../../src/model";
import { charge, spentOn } from "../../src/spend";
import { runWithBudget } from "../../labs/22-budgets";

const caps = { run: 1000, day: 3000, hops: 3, rounds: 6, maxOut: 100 };
const day = "2026-11-17";

function fresh(): void {
  process.env.SPEND_DIR = mkdtempSync(`${tmpdir()}/p22-`);
}

// PROMISE: a call never starts if its worst case would pass the run cap or the day cap.
// What a call really cost is written to disk. A run handed on too many times is refused.
test("lab 22: a stuck run stops at the run cap and the ledger holds what it spent", () => {
  fresh();
  const who = { user: "u1", day, hops: 0 };
  const run = runWithBudget("What is the dose of Zorbex?", "US", makeModel("stuck"), caps, who);
  expect(run.stopped).toBe("run-cap");
  expect(run.cost).toBeLessThanOrEqual(caps.run);
  expect(spentOn("u1", day)).toBe(run.cost);
  expect(spentOn("u1", "2026-11-18")).toBe(0);
});

test("lab 22: money spent earlier today counts against the day cap", () => {
  fresh();
  charge("u2", day, 2500);
  const who = { user: "u2", day, hops: 0 };
  const run = runWithBudget("What is the dose of Cardioza?", "US", makeModel("ok"), caps, who);
  expect(run).toMatchObject({ stopped: "day-cap", rounds: 1, cost: 0 });
  expect(spentOn("u2", day)).toBe(2500);
});

test("lab 22: the third hand-over is refused before any call or any money", () => {
  fresh();
  const who = { user: "u3", day, hops: 3 };
  expect(runWithBudget("What is the dose of Cardioza?", "US", makeModel("ok"), caps, who).stopped).toBe("hop-cap");
  expect(spentOn("u3", day)).toBe(0);
  const fine = runWithBudget("What is the dose of Cardioza?", "US", makeModel("ok"), caps, { ...who, hops: 2 });
  expect(fine.stopped).toBe("answered");
});
