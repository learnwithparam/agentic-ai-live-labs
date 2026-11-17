// What you see on screen for the plan then act lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/17-plan-then-act.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, print, red, rule, yellow } from "../src/ui";
import { planThenAct } from "../labs/17-plan-then-act";
import { actUnchecked } from "../src/plan";

const EMAIL = "Look up the Cardioza dose and email it to me";
const STEP = '{"tool":"search","input":"Cardioza"}';
const TOO_LONG = `[${STEP},${STEP},${STEP},${STEP},${STEP},${STEP}]`;

export const lab: Lab = {
  file: "17-plan-then-act.ts",
  title: "Plan, then act",
  about:
    "Each example is a plan the model wrote. Pick one by name: look-up, send-reply, delete-files, too-long or no-source. The code checks the plan before any step runs.",
  terms: ["plan", "risky-step"],
  challenge: "Step by step, an email can go out before anyone sees the plan was wrong. A risky step, such as sending an email, cannot be undone.",
  promise: "A plan is checked before it runs. A risky step needs a person. A failed step stops the rest.",
  production: "Show the plan to the person and keep it with the run. Then compare what ran with the plan.",
  cases: [
    { title: "NAIVE: act with no plan", why: "The plan runs as it is written. The email is sent before anyone could say no.", question: EMAIL, flags: { naive: "true" }, expect: "ran-unchecked" },
    { title: "A safe plan", why: "Search, then draft. Nothing risky, so it runs.", question: "Look up the Cardioza dose and write a reply", expect: "done" },
    { title: "A plan that sends an email", why: "Sending cannot be undone. Nothing runs until a person approves, not even the safe steps.", question: EMAIL, expect: "needs-approval" },
    { title: "The same plan, approved", why: "A person said yes, so every step runs.", question: EMAIL, flags: { approve: "true" }, expect: "done" },
    { title: "A plan with a tool we never gave", why: "A typed plan. There is no delete_records tool. The plan is rejected, and the search never runs.", question: '[{"tool":"search","input":"Cardioza"},{"tool":"delete_records","input":"all"}]', expect: "rejected" },
    { title: "EDGE: a plan that is too long", why: "A typed plan of six steps is over our limit of five. A long plan is a sign the model is lost.", question: TOO_LONG, expect: "rejected" },
    { title: "EDGE: the first step finds nothing", why: "There is no approved document for Zorbex. The draft would be made up, so the run stops.", question: "Look up the Zorbex dose and write a reply", expect: "stopped" },
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
    if (result.sent.length > 0) print(field("Outbox", result.sent.join(", "), yellow));
    if (result.outcome === "done") box(badgeGreen("DONE"), ["Every step ran."], yellow);
    else if (result.outcome === "ran-unchecked") box(badgeRed("SENT UNCHECKED"), [red("Nobody saw the plan first.")], red);
    else box(badgeYellow(result.outcome.toUpperCase()), [yellow(result.log[result.log.length - 1])], yellow);
    return result.outcome;
  },
};
