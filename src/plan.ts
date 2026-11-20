// The pieces the plan then act lab uses. The Chief of Staff bot gets Maya ready for a meeting.
// All the calendars, papers and numbers here are invented.

import type { CallLlm } from "./model";
import type { Outcome, Plan, Step } from "../labs/17-plan-then-act";

export const NO_SLOT = "No free slot.";
const MOST_NAIVE_STEPS = 8;

// One step. The room list is the bot's own record of what it booked.
export function runStep(step: Step, booked: string[]): string {
  if (step.tool === "calendar") {
    if (step.input.toLowerCase().includes("thursday")) return "Thursday 10:00 is free.";
    return NO_SLOT;
  }
  if (step.tool === "docs") return "Collected 3 board papers.";
  if (step.tool === "metrics") return "Billed 41200 USD this quarter. 6 projects open.";
  if (step.tool === "agenda") return "Agenda written. It needs a room.";
  if (step.tool === "book_room") {
    booked.push(step.input);
    if (booked.length > 1) return `Room booked: ${step.input} (again).`;
    return `Room booked: ${step.input}.`;
  }
  return `ran ${step.tool}`;
}

// A task that starts with [ is a plan someone typed. Anything else the model plans.
export function writePlan(task: string, callLlm: CallLlm): Plan {
  let text = task;
  if (!task.startsWith("[")) {
    const rule = "Tools: calendar, docs, metrics, agenda, book_room. Reply with a JSON list of steps. " +
      'Each step looks like {"tool": "calendar", "input": "..."}.';
    text = callLlm([{ role: "user", content: `BOARD: ${rule}\nTask: ${task}` }], []).text || "";
  }
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
}

// The naive way: no plan. The model picks one step at a time, and sees only the last result.
export function actUnchecked(task: string, callLlm: CallLlm): Outcome {
  const plan: Plan = [];
  const done: string[] = [];
  const booked: string[] = [];
  let last = "Nothing yet.";
  for (let turn = 0; turn < MOST_NAIVE_STEPS; turn++) {
    const prompt = `NEXT: Pick the next step, or reply DONE.\nTask: ${task}\nLast result: ${last}`;
    const text = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
    if (text === "DONE") break;
    const step: Step = JSON.parse(text);
    last = runStep(step, booked);
    plan.push(step);
    done.push(`${step.tool}: ${step.input}`);
  }
  const log = [`Every step ran. Nobody saw a plan first. The room was booked ${booked.length} times.`];
  return { outcome: "ran-unchecked", plan, done, booked, log };
}
