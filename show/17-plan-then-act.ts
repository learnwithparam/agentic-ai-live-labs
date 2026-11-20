// What you see on screen for the plan then act lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/17-plan-then-act.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, print, red, rule, yellow } from "../src/ui";
import { planThenAct } from "../labs/17-plan-then-act";
import { actUnchecked } from "../src/plan";

const PREP = "Prep me for Thursday's board meeting.";
const STEP = '{"tool":"calendar","input":"Thursday"}';
const TOO_LONG = `[${STEP},${STEP},${STEP},${STEP},${STEP},${STEP}]`;
const ROOM = '{"tool":"book_room","input":"Boardroom 2"}';
const TWICE = `[${STEP},${ROOM},${ROOM}]`;
const BAD_TOOL = `[${STEP},{"tool":"pay_invoice","input":"all"}]`;

export const lab: Lab = {
  file: "17-plan-then-act.ts",
  title: "Plan, then act",
  about:
    "Each example is a job for the Chief of Staff bot, or a plan someone typed. The model writes the plan. The code checks the plan before any step runs, and Maya approves it if a step is risky.",
  terms: ["plan", "risky-step"],
  challenge: "Step by step, the bot forgets what it did and books the room twice. A risky step, such as booking a room, cannot be undone.",
  promise: "A plan is checked before it runs. A risky step needs Maya. A failed step stops the rest.",
  production: "Show Maya the plan and keep it with the run. Then compare what ran with the plan.",
  cases: [
    { title: "NAIVE: act with no plan", why: "The bot sees only the last result. It books the room, then books it again after the agenda.", question: PREP, flags: { naive: "true" }, expect: "ran-unchecked" },
    { title: "A safe plan", why: "Papers, numbers, agenda. Nothing risky, so it runs.", question: "Draft the agenda for the board meeting.", expect: "done" },
    { title: "A plan that books a room", why: "A booking cannot be undone. Nothing runs until Maya approves, not even the safe steps.", question: PREP, expect: "needs-approval" },
    { title: "The same plan, approved", why: "Maya said yes, so every step runs, and the room is booked once.", question: PREP, flags: { approve: "true" }, expect: "done" },
    { title: "A plan with a tool we never gave", why: "A typed plan. There is no pay_invoice tool. The plan is rejected, and the calendar is never read.", question: BAD_TOOL, expect: "rejected" },
    { title: "EDGE: a plan that books twice", why: "The same booking appears two times. The check rejects it, so the double booking never happens.", question: TWICE, expect: "rejected" },
    { title: "EDGE: a plan that is too long", why: "A typed plan of six steps is over our limit of five. A long plan is a sign the model is lost.", question: TOO_LONG, expect: "rejected" },
    { title: "EDGE: the first step finds nothing", why: "Monday has no free slot. Booking a room anyway would be a guess, so the run stops.", question: "Prep me for Monday's board meeting.", flags: { approve: "true" }, expect: "stopped" },
  ],
  play(task, flags) {
    const model = modelFrom(flags);
    print(field("Task", task));
    const result = flags.naive ? actUnchecked(task, model) : planThenAct(task, flags.approve === "true", model);
    rule("THE PLAN");
    result.plan.forEach((step, index) => console.log(`${dim(String(index + 1))} ${step.tool}: ${step.input}`));
    rule("LOG, STEP BY STEP");
    for (const line of result.log) console.log(dim(line));
    console.log();
    for (const line of result.done) console.log(`${badgeGreen("RAN")} ${dim(line)}`);
    if (result.done.length === 0) console.log(dim("Nothing ran."));
    if (result.booked.length > 0) print(field("Rooms booked", String(result.booked.length), yellow));
    if (result.outcome === "done") box(badgeGreen("DONE"), ["Every step ran."], yellow);
    else if (result.outcome === "ran-unchecked") box(badgeRed("BOOKED UNCHECKED"), [red("Nobody saw the plan first.")], red);
    else box(badgeYellow(result.outcome.toUpperCase()), [yellow(result.log[result.log.length - 1])], yellow);
    return result.outcome;
  },
};
