import { expect, test } from "bun:test";
import { checkPlan, naiveRun, PLANS, runPlan } from "../../labs/17-plan-then-act";

// PROMISE: a plan is checked before it runs. A risky step needs a person. A failed step stops the rest.
test("lab 17: a bad plan runs nothing at all", () => {
  expect(runPlan(PLANS["delete-files"], true)).toMatchObject({ outcome: "rejected", done: [] });
  expect(runPlan(PLANS["too-long"], true)).toMatchObject({ outcome: "rejected", done: [] });
  expect(checkPlan(PLANS["send-reply"]).risky.length).toBe(1);
});

test("lab 17: a risky step waits for a person", () => {
  expect(runPlan(PLANS["send-reply"], false)).toMatchObject({ outcome: "needs-approval", done: [] });
  expect(runPlan(PLANS["send-reply"], true).done.length).toBe(3);
  expect(naiveRun(PLANS["send-reply"]).done.length).toBe(3);
});

test("lab 17: a step that finds nothing stops the rest", () => {
  const result = runPlan(PLANS["no-source"], false);
  expect(result.outcome).toBe("stopped");
  expect(result.done).toEqual([]);
  expect(runPlan(PLANS["look-up"], false).outcome).toBe("done");
});
