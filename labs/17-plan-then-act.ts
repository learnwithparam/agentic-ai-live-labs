// Lab 17: Write the plan first, then act
//
// Dr. Lee asks the agent to look up the Cardioza dose and email it to them.
// An agent can act one step at a time. Then it finds out too late that a step was a bad idea.
// Or it can write the whole plan first. Then our code checks the plan before anything runs.
// Sending an email cannot be undone. So a person must approve it before the first step starts.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/17-plan-then-act.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/17-plan-then-act.ts --question "Look up the Cardioza dose and email it to me" --naive
//   bun labs/17-plan-then-act.ts --question "Look up the Cardioza dose and write a reply"
//   bun labs/17-plan-then-act.ts --question "Look up the Cardioza dose and email it to me"
//   bun labs/17-plan-then-act.ts --question "Look up the Cardioza dose and email it to me" --approve true
//   bun labs/17-plan-then-act.ts --demo

import { NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { actUnchecked, runStep, writePlan } from "../src/plan"; // the plan writer and the steps

export type Step = { tool: string; input: string };
export type Plan = Step[];
export type Checked = { ok: boolean; reason: string; risky: Step[] };
export type Outcome = {
  outcome: string;
  plan: Plan;
  done: string[];
  sent: string[];
  log: string[];
};

export const ALLOWED_TOOLS = ["search", "draft", "send_email"];
export const RISKY_TOOLS = ["send_email"];
export const MOST_STEPS = 5;

// Plan first, check the plan, ask a person if needed, then run. Read the steps in order.
export function planThenAct(task: string, approved: boolean, callLlm: CallLlm): Outcome {
  // Step 1: the model writes the whole plan as a list of steps. Nothing runs yet.
  const plan = writePlan(task, callLlm);
  const log = [`Step 1: the plan has ${plan.length} steps.`];

  // Step 2: check the whole plan before anything runs.
  const checked = checkPlan(plan);
  if (!checked.ok) return stopWith("rejected", plan, `Step 2: rejected, ${checked.reason}.`, log);
  log.push("Step 2: the plan is allowed.");

  // Step 3: a risky step needs a person to say yes. Until then, even the safe steps wait.
  if (checked.risky.length > 0 && !approved) {
    return stopWith("needs-approval", plan, "Step 3: a person must approve the email.", log);
  }

  // Step 4: run the steps in order. A search that finds nothing stops the rest.
  const done: string[] = [];
  const sent: string[] = [];
  let found = "";
  for (const step of plan) {
    const reply = runStep(step, found, sent, callLlm);
    if (reply === NO_DOC) return stopWith("stopped", plan, `Step 4: ${step.tool} found none.`, log);
    if (step.tool === "search") found = reply;
    done.push(`${step.tool}: ${step.input}`);
  }
  log.push(`Step 4: ran ${done.length} steps. Sent ${sent.length} emails.`);
  return { outcome: "done", plan, done, sent, log };
}

function stopWith(outcome: string, plan: Plan, line: string, log: string[]): Outcome {
  log.push(line);
  return { outcome, plan, done: [], sent: [], log };
}

// The check: only our tools, and not too many steps.
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

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/17-plan-then-act");
  runLab(lab);
}
