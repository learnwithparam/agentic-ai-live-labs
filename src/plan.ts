// The pieces the plan then act lab uses to write and run a plan.

import type { CallLlm } from "./model";
import type { Outcome, Plan, Step } from "../labs/17-plan-then-act";
import { searchApprovedDocs } from "../labs/01-agent-loop";

// One step. The search is the agent loop's search. The draft is written by the model. Email goes to an outbox.
export function runStep(step: Step, found: string, sent: string[], callLlm: CallLlm): string {
  if (step.tool === "search") return searchApprovedDocs(step.input, "US");
  if (step.tool === "draft") {
    const prompt = `MAIL: Write a short reply to the doctor from this source only.\nSOURCE: ${found}`;
    return (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
  }
  if (step.tool === "send_email") sent.push(step.input);
  return `ran ${step.tool}`;
}

// A task that starts with [ is a plan someone typed. Anything else the model plans.
export function writePlan(task: string, callLlm: CallLlm): Plan {
  let text = task;
  if (!task.startsWith("[")) {
    const rule = "Tools: search, draft, send_email. Reply with a JSON list of steps. " +
      'Each step looks like {"tool": "search", "input": "..."}.';
    text = callLlm([{ role: "user", content: `PLAN: ${rule}\nTask: ${task}` }], []).text || "";
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

// The naive way: no check and no person. Each step runs as soon as the plan names it.
export function actUnchecked(task: string, callLlm: CallLlm): Outcome {
  const plan = writePlan(task, callLlm);
  const done: string[] = [];
  const sent: string[] = [];
  let found = "";
  for (const step of plan) {
    const reply = runStep(step, found, sent, callLlm);
    if (step.tool === "search") found = reply;
    done.push(`${step.tool}: ${step.input}`);
  }
  return { outcome: "ran-unchecked", plan, done, sent, log: ["Every step ran. Nobody saw the plan first."] };
}
