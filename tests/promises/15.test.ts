import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { runLimited, runUnlimited } from "../../labs/15-stop-conditions";

const FIX = "Fix the failing coupon test";
const limits = { maxSteps: 6, maxRepeats: 1, maxSeconds: 120, maxCents: 6 };
const habits = ["ok", "stuck", "wanders"] as const;

// PROMISE: a run always stops within its steps, its time and its money, and says why it stopped.
// The same call twice stops it.
test("every habit stops inside the limits, with a reason", () => {
  for (const habit of habits) {
    const run = runLimited(FIX, makeModel(habit), limits);
    expect(run.steps).toBeLessThanOrEqual(limits.maxSteps);
    expect(run.spent / 100).toBeLessThanOrEqual(limits.maxCents);
    expect(run.stopped).not.toBe("");
    expect(run.log[run.log.length - 1]).toContain(run.stopped === "answered" ? "answered" : run.stopped);
  }
});

test("each limit stops the model that breaks it", () => {
  expect(runLimited(FIX, makeModel("ok"), limits).stopped).toBe("answered");
  expect(runLimited(FIX, makeModel("stuck"), limits).stopped).toBe("same-call");
  const wanders = { ...limits, maxSeconds: 9999 };
  expect(runLimited(FIX, makeModel("wanders"), wanders).stopped).toBe("max-steps");
  const slow = { maxSteps: 12, maxRepeats: 1, maxSeconds: 90, maxCents: 50 };
  expect(runLimited(FIX, makeModel("wanders"), slow).stopped).toBe("out-of-time");
  expect(runLimited(FIX, makeModel("ok"), { ...limits, maxCents: 1 }).stopped).toBe("out-of-money");
});

test("the same call twice stops, and a raised limit allows the retry", () => {
  const run = runLimited(FIX, makeModel("stuck"), limits);
  expect(run.steps).toBe(2);
  const fair = runLimited(FIX, makeModel("stuck"), { ...limits, maxRepeats: 3 });
  expect(fair.steps).toBe(4);
  expect(fair.stopped).toBe("same-call");
});

test("no limit means the model never stops by itself", () => {
  expect(runUnlimited(FIX, makeModel("stuck"), 50).stopped).toBe("never-stopped");
});
