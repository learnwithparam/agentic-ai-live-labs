import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { checkPlan, planThenAct } from "../../labs/17-plan-then-act";
import { actUnchecked } from "../../src/plan";

const model = makeModel();
const MAIL = "Look up the Cardioza dose and email it to me";
const DELETE = '[{"tool":"search","input":"Cardioza"},{"tool":"delete_records","input":"all"}]';
const STEP = '{"tool":"search","input":"Cardioza"}';
const LONG = `[${STEP},${STEP},${STEP},${STEP},${STEP},${STEP}]`;

// PROMISE: a plan is checked before it runs. A risky step needs a person. A failed step stops the rest.
test("a bad plan runs nothing at all", () => {
  expect(planThenAct(DELETE, true, model)).toMatchObject({ outcome: "rejected", done: [] });
  expect(planThenAct(LONG, true, model)).toMatchObject({ outcome: "rejected", done: [] });
  expect(checkPlan([{ tool: "send_email", input: "a@b.c" }]).risky.length).toBe(1);
});

test("a risky step waits for a person", () => {
  expect(planThenAct(MAIL, false, model)).toMatchObject({ outcome: "needs-approval", done: [], sent: [] });
  expect(planThenAct(MAIL, true, model).sent).toEqual(["dr.lee@example.com"]);
  expect(actUnchecked(MAIL, model).sent.length).toBe(1);
});

test("a step that finds nothing stops the rest", () => {
  const result = planThenAct("Look up the Zorbex dose and write a reply", false, model);
  expect(result.outcome).toBe("stopped");
  expect(result.done).toEqual([]);
  expect(planThenAct("Look up the Cardioza dose and write a reply", false, model).outcome).toBe("done");
});
