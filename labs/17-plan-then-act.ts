// Write the plan first, then act
//
// Maya tells the Chief of Staff bot to prep her for Thursday's board meeting.
// The bot checks the calendar, collects papers, pulls numbers, writes an agenda and books a room.
// An agent can act one step at a time. Then it forgets what it did, and books the room twice.
// Or it can write the whole plan first. Then our code checks the plan before anything runs.
// Booking a room cannot be undone. So Maya must approve the plan before the first step starts.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/17-plan-then-act.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab plan-then-act --question "Prep me for Thursday's board meeting." --naive
//   bun run lab plan-then-act --question "Draft the agenda for the board meeting."
//   bun run lab plan-then-act --question "Prep me for Thursday's board meeting."
//   bun run lab plan-then-act --question "Prep me for Thursday's board meeting." --approve true
//   bun run lab plan-then-act --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { NO_SLOT, runStep, writePlan } from "../src/plan"; // the plan writer and the steps

export type Step = { tool: string; input: string };
export type Plan = Step[];
export type Checked = { ok: boolean; reason: string; risky: Step[] };
export type Outcome = {
  outcome: string;
  plan: Plan;
  done: string[];
  booked: string[];
  log: string[];
};

export const ALLOWED_TOOLS = ["calendar", "docs", "metrics", "agenda", "book_room"];
export const RISKY_TOOLS = ["book_room"];
export const MOST_STEPS = 5;

// Plan first, check the plan, ask Maya if needed, then run. Read the steps in order.
export function planThenAct(task: string, approved: boolean, callLlm: CallLlm): Outcome {
  // Step 1: the model writes the whole plan as a list of steps. Nothing runs yet.
  const plan = writePlan(task, callLlm);
  const log = [`Step 1: the plan has ${plan.length} steps.`];

  // Step 2: check the whole plan before anything runs.
  const checked = checkPlan(plan);
  if (!checked.ok) return stopWith("rejected", plan, `Step 2: rejected, ${checked.reason}.`, log);
  log.push("Step 2: the plan is allowed.");

  // Step 3: a risky step needs Maya to say yes. Until then, even the safe steps wait.
  if (checked.risky.length > 0 && !approved) {
    return stopWith("needs-approval", plan, "Step 3: Maya must approve the booking.", log);
  }

  // Step 4: run the steps in order. A calendar with no free slot stops the rest.
  const done: string[] = [];
  const booked: string[] = [];
  for (const step of plan) {
    const reply = runStep(step, booked);
    if (reply === NO_SLOT) return stopWith("stopped", plan, "Step 4: no free slot.", log);
    done.push(`${step.tool}: ${step.input}`);
  }
  log.push(`Step 4: ran ${done.length} steps. Booked ${booked.length} rooms.`);
  return { outcome: "done", plan, done, booked, log };
}

function stopWith(outcome: string, plan: Plan, line: string, log: string[]): Outcome {
  log.push(line);
  return { outcome, plan, done: [], booked: [], log };
}

// The check: only our tools, not too many steps, and no risky step twice.
export function checkPlan(plan: Plan): Checked {
  const risky: Step[] = [];
  if (plan.length > MOST_STEPS) return { ok: false, reason: "too many steps", risky };
  for (const step of plan) {
    if (!ALLOWED_TOOLS.includes(step.tool)) {
      return { ok: false, reason: `no tool named ${step.tool}`, risky };
    }
    if (RISKY_TOOLS.includes(step.tool)) risky.push(step);
    if (risky.length > 1) return { ok: false, reason: `${step.tool} twice`, risky };
  }
  return { ok: true, reason: "", risky };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/17-plan-then-act");
  runLab(lab);
}
