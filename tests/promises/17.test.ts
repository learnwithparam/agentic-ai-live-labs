import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { checkPlan, planThenAct } from "../../labs/17-plan-then-act";
import { actUnchecked } from "../../src/plan";

const model = makeModel();
const PREP = "Prep me for Thursday's board meeting.";
const STEP = '{"tool":"calendar","input":"Thursday"}';
const ROOM = '{"tool":"book_room","input":"Boardroom 2"}';
const BAD_TOOL = `[${STEP},{"tool":"pay_invoice","input":"all"}]`;
const TWICE = `[${STEP},${ROOM},${ROOM}]`;
const LONG = `[${STEP},${STEP},${STEP},${STEP},${STEP},${STEP}]`;

// PROMISE: a plan is checked before it runs. A risky step needs Maya. A failed step stops the rest.
test("a bad plan runs nothing at all", () => {
  expect(planThenAct(BAD_TOOL, true, model)).toMatchObject({ outcome: "rejected", done: [] });
  expect(planThenAct(LONG, true, model)).toMatchObject({ outcome: "rejected", done: [] });
  expect(planThenAct(TWICE, true, model)).toMatchObject({ outcome: "rejected", booked: [] });
  expect(checkPlan([{ tool: "book_room", input: "Boardroom 2" }]).risky.length).toBe(1);
});

test("a risky step waits for Maya", () => {
  expect(planThenAct(PREP, false, model)).toMatchObject({ outcome: "needs-approval", done: [], booked: [] });
  expect(planThenAct(PREP, true, model).booked).toEqual(["Boardroom 2"]);
  expect(actUnchecked(PREP, model).booked.length).toBe(2);
});

test("a step that finds nothing stops the rest", () => {
  const result = planThenAct("Prep me for Monday's board meeting.", true, model);
  expect(result.outcome).toBe("stopped");
  expect(result.done).toEqual([]);
  expect(planThenAct("Draft the agenda for the board meeting.", false, model).outcome).toBe("done");
});
