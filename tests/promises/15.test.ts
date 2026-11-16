import { expect, test } from "bun:test";
import { DECIDERS, LIMITS, runLoop } from "../../labs/15-stop-conditions";

// PROMISE: a run always stops within its steps and its budget, and says why it stopped.
test("lab 15: every pretend model stops inside the limits, with a reason", () => {
  for (const name of Object.keys(DECIDERS)) {
    const run = runLoop(DECIDERS[name], LIMITS);
    expect(run.steps).toBeLessThanOrEqual(LIMITS.maxSteps);
    expect(run.spent).toBeLessThanOrEqual(LIMITS.budget);
    expect(run.stopped).not.toBe("");
  }
});

test("lab 15: each limit stops the model that breaks it", () => {
  const reason = (name: string) => runLoop(DECIDERS[name], LIMITS).stopped;
  expect(reason("answers")).toBe("answered");
  expect(reason("stuck")).toBe("repeat");
  expect(reason("wanders")).toBe("max-steps");
  expect(reason("expensive")).toBe("out-of-budget");
  expect(reason("retry-once")).toBe("answered");
  expect(reason("too-late")).toBe("max-steps");
});
