// Lab 15: When the loop must stop
//
// An agent loop asks the model what to do, runs it, and asks again.
// A model can get stuck, wander, or spend too much. So the loop itself needs three limits.
// The PART 2 section only prints the result in colour.
//
// Run it (copy any line):
//   bun labs/15-stop-conditions.ts --question "stuck" --naive
//   bun labs/15-stop-conditions.ts --question "answers"
//   bun labs/15-stop-conditions.ts --question "stuck"
//   bun labs/15-stop-conditions.ts --question "wanders"
//   bun labs/15-stop-conditions.ts --demo

import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";

// PART 1: THE CORE LOGIC

export type Action = { kind: string; tool: string; input: string; cost: number };
export type Decide = { (log: string[]): Action }; // the model: sees the calls so far
export type Limits = { maxSteps: number; maxRepeats: number; budget: number };
export type Run = { stopped: string; steps: number; spent: number; log: string[] };

function timesSeen(log: string[], key: string): number {
  let count = 0;
  for (const line of log) {
    if (line === key) count += 1;
  }
  return count;
}

function finish(stopped: string, steps: number, spent: number, log: string[]): Run {
  return { stopped, steps, spent, log };
}

// Three limits. Every way out says why it stopped.
export function runLoop(decide: Decide, limits: Limits): Run {
  const log: string[] = [];
  let spent = 0;
  for (let step = 1; step <= limits.maxSteps; step++) {
    const action = decide(log);
    if (action.kind === "answer") return finish("answered", step, spent, log);
    const key = `${action.tool}: ${action.input}`;
    if (timesSeen(log, key) >= limits.maxRepeats) return finish("repeat", step, spent, log);
    if (spent + action.cost > limits.budget) return finish("out-of-budget", step, spent, log);
    spent += action.cost;
    log.push(key);
  }
  return finish("max-steps", limits.maxSteps, spent, log);
}

// The NAIVE way: run until the model says it is done. The demo cuts it at a cap, or it would never end.
export function naiveLoop(decide: Decide, demoCap: number): Run {
  const log: string[] = [];
  let spent = 0;
  for (let step = 1; step <= demoCap; step++) {
    const action = decide(log);
    if (action.kind === "answer") return finish("answered", step, spent, log);
    spent += action.cost;
    log.push(`${action.tool}: ${action.input}`);
  }
  return finish("never-stopped", demoCap, spent, log);
}

// PART 2: HOW IT IS SHOWN (you can skip this)

export const LIMITS: Limits = { maxSteps: 6, maxRepeats: 2, budget: 100 };

function call(input: string, cost = 15): Action {
  return { kind: "call", tool: "search", input, cost };
}

const ANSWER: Action = { kind: "answer", tool: "", input: "", cost: 0 };

// Pretend models. Each one behaves in one way, so we can watch the limits work.
export const DECIDERS: Record<string, Decide> = {
  answers: (log) => (log.length === 0 ? call("Cardioza dose") : ANSWER),
  stuck: () => call("Cardioza dose"),
  wanders: (log) => call(`topic ${log.length}`),
  expensive: (log) => call(`topic ${log.length}`, 40),
  "just-in-time": (log) => (log.length < 5 ? call(`topic ${log.length}`) : ANSWER),
  "too-late": (log) => (log.length < 7 ? call(`topic ${log.length}`) : ANSWER),
  "retry-once": (log) => (log.length < 2 ? call("Cardioza dose") : ANSWER),
};

export const lab: Lab = {
  file: "15-stop-conditions.ts",
  title: "Lab 15: when the loop must stop",
  about:
    "Each example is a pretend model with one habit. Pick one by name: answers, stuck, wanders, expensive, just-in-time, too-late or retry-once. The loop allows 6 steps, 2 identical calls and 100 tokens.",
  terms: "step = one trip round the loop. repeat = the same call again. budget = the most we allow a run to spend.",
  challenge: "A model that is stuck never says it is done. A loop that trusts the model runs and bills forever.",
  promise: "A run always stops within its steps and its budget, and says why it stopped.",
  production: "Set the limits per task, alert when a run hits one, and show the stop reason to the person.",
  cases: [
    { title: "NAIVE: trust the model to stop", why: "The model keeps making the same call. With no limit of our own, the loop never ends. The demo cuts it at 200 steps.", question: "stuck", flags: { naive: "true" }, expect: "never-stopped" },
    { title: "A model that answers", why: "One search, then an answer. The normal case. No limit is touched.", question: "answers", expect: "answered" },
    { title: "A model that is stuck", why: "The same call again and again. We allow it twice, because a retry can be fair. The third time we stop.", question: "stuck", expect: "repeat" },
    { title: "A model that wanders", why: "A new call each time, so it is not a repeat. The step limit ends it.", question: "wanders", expect: "max-steps" },
    { title: "A model with costly calls", why: "Each call costs 40 tokens. The third would pass the budget of 100, so we stop before paying.", question: "expensive", expect: "out-of-budget" },
    { title: "EDGE: an answer at the last step", why: "The answer comes on step 6, the last one allowed. It is read.", question: "just-in-time", expect: "answered" },
    { title: "EDGE: an answer one step too late", why: "The answer would come on step 7. We stop first, so it is never read. Choose limits for the real task.", question: "too-late", expect: "max-steps" },
    { title: "A fair retry", why: "The same call twice, then an answer. Two identical calls are allowed, so this is fine.", question: "retry-once", expect: "answered" },
  ],
  play(name, flags) {
    const decide = DECIDERS[name];
    if (!decide) {
      box("ERROR", [red(`No model "${name}". Try: ${Object.keys(DECIDERS).join(", ")}`)], red);
      return "error";
    }
    print(field("Model", name));
    print(field("Limits", `${LIMITS.maxSteps} steps, ${LIMITS.maxRepeats} identical calls, ${LIMITS.budget} tokens`));
    const run = flags.naive ? naiveLoop(decide, 200) : runLoop(decide, LIMITS);
    rule("THE RUN");
    for (const line of run.log.slice(0, 8)) console.log(`${badgeGreen("CALL")} ${dim(line)}`);
    if (run.log.length > 8) console.log(dim(`... and ${run.log.length - 8} more calls`));
    print(field("Steps", String(run.steps)));
    print(field("Spent", `${run.spent} tokens`, run.spent > LIMITS.budget ? red : green));
    const badge = run.stopped === "answered" ? badgeGreen("ANSWERED") : badgeYellow(run.stopped.toUpperCase());
    if (run.stopped === "never-stopped") box(badgeRed("NEVER STOPPED"), [red("Cut by the demo. A real run would go on and on.")], red);
    else box(badge, [yellow(`Stopped because: ${run.stopped}`)], yellow);
    return run.stopped;
  },
};

if (import.meta.main) runLab(lab);
