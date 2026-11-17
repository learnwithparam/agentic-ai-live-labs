import { expect, test } from "bun:test";
import type { CallLlm } from "../../src/model";
import { runLimited } from "../../labs/15-stop-conditions";

// Test models. Each one has one habit, so we can watch each limit work.
function search(query: string): ReturnType<CallLlm> {
  return { toolCall: { name: "search_approved_docs", args: { query, country: "US", hcpId: "none" } } };
}
const answers: CallLlm = (messages) => (messages.length < 3 ? search("What is the dose of Cardioza?") : { text: "ok" });
const stuck: CallLlm = () => search("What is the dose of Zorbex?");
const wanders: CallLlm = (messages) => search(`topic ${messages.length}`);
const limits = { maxSteps: 6, maxRepeats: 2, budget: 400 };

// PROMISE: a run always stops within its steps and its budget, and says why it stopped.
test("lab 15: every test model stops inside the limits, with a reason", () => {
  for (const model of [answers, stuck, wanders]) {
    const run = runLimited("What is the dose of Zorbex?", "US", model, limits);
    expect(run.steps).toBeLessThanOrEqual(limits.maxSteps);
    expect(run.spent).toBeLessThanOrEqual(limits.budget);
    expect(run.stopped).not.toBe("");
  }
});

test("lab 15: each limit stops the model that breaks it", () => {
  expect(runLimited("q", "US", answers, limits).stopped).toBe("answered");
  expect(runLimited("q", "US", stuck, limits).stopped).toBe("repeat");
  expect(runLimited("q", "US", wanders, limits).stopped).toBe("max-steps");
  expect(runLimited("q", "US", answers, { ...limits, budget: 5 }).stopped).toBe("out-of-budget");
});
