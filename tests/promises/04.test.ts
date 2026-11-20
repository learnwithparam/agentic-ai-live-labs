import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { ISSUE_LABELS } from "../../src/studio-bots";
import { ISSUES } from "../../src/team";
import { fixAndReview, labelWorkflow, runTriageAgent } from "../../labs/04-shapes";

const yes = () => "y";
const no = () => "n";

// PROMISE: labels come from code and never vary, an agent pays for every round,
// and an auditor stops a fix that names the wrong test.
test("the workflow labels every issue the same way, and costs no tokens", () => {
  for (const issue of ISSUES) {
    const first = labelWorkflow(issue.id);
    expect(first.answer).toBe(issue.label);
    expect(first.tokens).toBe(0);
    expect(labelWorkflow(issue.id).answer).toBe(first.answer);
  }
});

test("an agent pays for every round, and a wandering one leaves the list", () => {
  const steady = runTriageAgent("label", "issue-102", makeModel("ok"));
  expect(steady.answer).toBe("feature");
  expect(steady.trace.length).toBe(4);
  expect(steady.tokens).toBeGreaterThan(0);
  const wandering = runTriageAgent("label", "issue-101", makeModel("wanders"));
  expect(ISSUE_LABELS).not.toContain(wandering.answer);
});

test("the agent reproduces a failing build and admits a green one", () => {
  expect(runTriageAgent("reproduce", "issue-103", makeModel("ok")).answer).toContain("coupon.test.ts");
  expect(runTriageAgent("reproduce", "issue-101", makeModel("ok")).answer).toContain("Cannot reproduce");
});

test("the auditor passes a true fix and stops a fix for the wrong test", () => {
  expect(fixAndReview("issue-103", makeModel("ok"), no).passed).toBe(true);
  const wrong = fixAndReview("issue-103", makeModel("invent"), no);
  expect(wrong.passed).toBe(false);
  expect(wrong.reply).toBe("REJECTED_BY_REVIEW");
  expect(fixAndReview("issue-103", makeModel("invent"), yes).reply).toContain("cart.test.ts");
});
