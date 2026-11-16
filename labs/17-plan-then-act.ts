// LAB 17: WRITE THE PLAN FIRST, THEN ACT
//
// Read PART 1. An agent can act one step at a time and find out too late that a step was a bad idea.
// Or it can write the whole plan first. Then the code checks the plan before anything runs.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun labs/17-plan-then-act.ts --question "send-reply" --naive
//   bun labs/17-plan-then-act.ts --question "look-up"
//   bun labs/17-plan-then-act.ts --question "send-reply"
//   bun labs/17-plan-then-act.ts --question "send-reply" --approve
//   bun labs/17-plan-then-act.ts --demo

import { NO_DOC } from "../src/data";
import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, print, red, rule, yellow } from "../src/ui";
import { searchApprovedDocs } from "./01-agent-loop"; // the search from lab 1

// PART 1: THE CORE LOGIC

export type Step = { tool: string; input: string };
export type Plan = Step[];
export type Checked = { ok: boolean; reason: string; risky: Step[] };
export type Outcome = { outcome: string; done: string[]; note: string };

export const ALLOWED_TOOLS = ["search", "draft", "send_email"];
export const RISKY_TOOLS = ["send_email"];
export const MOST_STEPS = 5;

// Look at the whole plan before anything runs.
export function checkPlan(plan: Plan): Checked {
  const risky: Step[] = [];
  if (plan.length > MOST_STEPS) return { ok: false, reason: "too many steps", risky };
  for (const step of plan) {
    if (!ALLOWED_TOOLS.includes(step.tool)) {
      return { ok: false, reason: `no tool named ${step.tool}`, risky };
    }
    if (RISKY_TOOLS.includes(step.tool)) risky.push(step);
  }
  return { ok: true, reason: "", risky };
}

// One step. The search is lab 1's search. The other two are pretend.
export function runStep(step: Step): string {
  if (step.tool === "search") return searchApprovedDocs(step.input, "US");
  if (step.tool === "draft") return "Draft written.";
  return "Email sent.";
}

export function runPlan(plan: Plan, approved: boolean): Outcome {
  const checked = checkPlan(plan);
  if (!checked.ok) return { outcome: "rejected", done: [], note: checked.reason };
  if (checked.risky.length > 0 && !approved) {
    return { outcome: "needs-approval", done: [], note: "a person must approve the risky step" };
  }
  const done: string[] = [];
  for (const step of plan) {
    const reply = runStep(step);
    if (reply === NO_DOC) return { outcome: "stopped", done, note: `${step.tool} found nothing` };
    done.push(`${step.tool}: ${step.input}`);
  }
  return { outcome: "done", done, note: "" };
}

// The NAIVE way: no plan and no check. Each step runs as soon as the model asks for it.
export function naiveRun(plan: Plan): Outcome {
  const done: string[] = [];
  for (const step of plan) {
    runStep(step);
    done.push(`${step.tool}: ${step.input}`);
  }
  return { outcome: "ran-unchecked", done, note: "nobody saw the plan first" };
}

// PART 2: HOW IT IS SHOWN (you can skip this)

const SEARCH: Step = { tool: "search", input: "Cardioza" };
const DRAFT: Step = { tool: "draft", input: "reply to the doctor" };
const SEND: Step = { tool: "send_email", input: "dr.lee@example.com" };

export const PLANS: Record<string, Plan> = {
  "look-up": [SEARCH, DRAFT],
  "send-reply": [SEARCH, DRAFT, SEND],
  "delete-files": [SEARCH, { tool: "delete_records", input: "all" }],
  "too-long": [SEARCH, SEARCH, SEARCH, DRAFT, DRAFT, DRAFT],
  "no-source": [{ tool: "search", input: "Zorbex" }, DRAFT],
};

export const lab: Lab = {
  file: "17-plan-then-act.ts",
  title: "Lab 17: plan, then act",
  about:
    "Each example is a plan the model wrote. Pick one by name: look-up, send-reply, delete-files, too-long or no-source. The code checks the plan before any step runs.",
  terms: "plan = the list of steps, written before the first one runs. risky step = one that cannot be undone, like sending an email.",
  challenge: "Step by step, the email is sent before anyone sees that the plan was wrong.",
  promise: "A plan is checked before it runs. A risky step needs a person. A failed step stops the rest.",
  production: "Show the plan to the person, keep it with the run, and compare what ran with what was planned.",
  cases: [
    { title: "NAIVE: act with no plan", why: "The model asks for the steps one at a time. The email is sent before anyone could say no.", question: "send-reply", flags: { naive: "true" }, expect: "ran-unchecked" },
    { title: "A safe plan", why: "Search, then draft. Nothing risky, so it runs.", question: "look-up", expect: "done" },
    { title: "A plan that sends an email", why: "Sending cannot be undone. Nothing runs until a person approves, not even the safe steps.", question: "send-reply", expect: "needs-approval" },
    { title: "The same plan, approved", why: "A person said yes, so every step runs.", question: "send-reply", flags: { approve: "true" }, expect: "done" },
    { title: "A plan with a tool we never gave", why: "There is no delete_records tool. The plan is rejected, and the search never runs.", question: "delete-files", expect: "rejected" },
    { title: "EDGE: a plan that is too long", why: "Six steps is over our limit of five. A long plan is a sign the model is lost.", question: "too-long", expect: "rejected" },
    { title: "EDGE: the first step finds nothing", why: "There is no approved document for Zorbex. The draft would be made up, so the run stops.", question: "no-source", expect: "stopped" },
  ],
  play(name, flags) {
    const plan = PLANS[name];
    if (!plan) {
      box("ERROR", [red(`No plan "${name}". Try: ${Object.keys(PLANS).join(", ")}`)], red);
      return "error";
    }
    print(field("Plan", name));
    rule("THE PLAN");
    plan.forEach((step, index) => console.log(`${dim(String(index + 1))} ${step.tool}: ${step.input}`));
    const result = flags.naive ? naiveRun(plan) : runPlan(plan, flags.approve === "true");
    rule("WHAT RAN");
    for (const line of result.done) console.log(`${badgeGreen("RAN")} ${dim(line)}`);
    if (result.done.length === 0) console.log(dim("Nothing ran."));
    if (result.outcome === "done") box(badgeGreen("DONE"), ["Every step ran."], yellow);
    else if (result.outcome === "ran-unchecked") box(badgeRed("SENT UNCHECKED"), [red(result.note)], red);
    else box(badgeYellow(result.outcome.toUpperCase()), [yellow(result.note)], yellow);
    return result.outcome;
  },
};

if (import.meta.main) runLab(lab);
