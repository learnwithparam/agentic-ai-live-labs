// When the loop must stop
//
// Juniper's Coding Agent has one job: fix the failing coupon test from build 2. It edits a file
// and runs the tests. A model that is stuck makes the same edit again and again. It never says
// it is done. A loop that trusts the model runs and bills forever. So the loop needs limits of
// its own: steps, the same call twice, time and money. Every stop prints its reason.
// Each round sends the whole chat again, so each round costs more than the one before.
// The clock and the price are pretend. Each tool is charged the time it usually takes, and
// 100 tokens cost 1 cent. A real run would read a real clock and the real bill.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/15-stop-conditions.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab stop-conditions --question "Fix the failing coupon test" --model stuck --naive
//   bun run lab stop-conditions --question "Fix the failing coupon test"
//   bun run lab stop-conditions --question "Fix the failing coupon test" --model stuck
//   bun run lab stop-conditions --question "Fix the failing coupon test" --model wanders
//   bun run lab stop-conditions --question "Fix the failing coupon test" --cents 2
//   bun run lab stop-conditions --demo

import type { CallLlm, Message } from "../src/model";
import { runLab } from "../src/runner";
import { CI_LOGS } from "../src/team";
import { TOKENS_PER_CENT, TOOLS, SECONDS_FOR, countOf, tokensIn, useTool } from "../src/coding-tools";

export type Limits = { maxSteps: number; maxRepeats: number; maxSeconds: number; maxCents: number };
export type Run = {
  answer: string;
  stopped: string;
  steps: number;
  spent: number;
  seconds: number;
  log: string[];
};

// Run the loop with four limits. Every way out says why it stopped. Read the steps in order.
export function runLimited(task: string, callLlm: CallLlm, limits: Limits): Run {
  const log: string[] = [];
  const seen: string[] = [];
  const edits: string[] = [];
  let spent = 0;
  let seconds = 0;

  // Step 1: start the chat with the rules, the task and the failing line.
  const failing = CI_LOGS["build-2"].split("\n")[0];
  const messages: Message[] = [
    { role: "system", content: "Change only the coupon code. Never skip a test." },
    { role: "user", content: `CODE: ${task}. Build 2 says: ${failing}` },
  ];
  const { maxSteps, maxRepeats, maxSeconds, maxCents } = limits;
  const shown = `${maxSteps} steps, ${maxRepeats} same call, ${maxSeconds} s, ${maxCents} cents`;
  log.push(`Step 1: limits are ${shown}.`);

  for (let step = 1; step <= limits.maxSteps; step++) {
    // Step 2: pay for this round. The whole chat is sent again, so the cost grows.
    spent += tokensIn(messages);
    const cents = spent / TOKENS_PER_CENT;
    if (cents > limits.maxCents) return stop("out-of-money", step, spent, seconds, log);

    // Step 3: check the clock. A slow run is stopped even if it is not stuck.
    if (seconds > limits.maxSeconds) return stop("out-of-time", step, spent, seconds, log);

    // Step 4: ask the model. If it gives an answer, we are done.
    const reply = callLlm(messages, TOOLS);
    if (!reply.toolCall) return finish(reply.text || "", step, spent, seconds, log);

    // Step 5: the same call again means the model is stuck. Stop it.
    const call = reply.toolCall;
    const key = `${call.name}: ${call.args.query}`;
    const again = countOf(seen, key) >= limits.maxRepeats;
    if (again) return stop("same-call", step, spent, seconds, log);
    seen.push(key);

    // Step 6: run the tool, charge its time and show the model what it returned.
    const result = useTool(call.name, call.args.query, edits);
    seconds += SECONDS_FOR[call.name];
    messages.push({ role: "tool", name: call.name, content: result });
    log.push(`Step 6: round ${step} used ${call.name} with "${call.args.query}". Spent ${spent}.`);
  }

  // Step 7: too many rounds. Stop, whatever the model wants.
  return stop("max-steps", limits.maxSteps, spent, seconds, log);
}

function finish(answer: string, steps: number, spent: number, seconds: number, log: string[]): Run {
  log.push(`Done: the model answered on round ${steps}.`);
  return { answer, stopped: "answered", steps, spent, seconds, log };
}

function stop(why: string, steps: number, spent: number, seconds: number, log: string[]): Run {
  log.push(`Stopped: ${why}, on round ${steps}.`);
  return { answer: `STOPPED: ${why}`, stopped: why, steps, spent, seconds, log };
}

// The naive way: no limit of our own. We trust the model to stop. The demo cuts it at a cap.
export function runUnlimited(task: string, callLlm: CallLlm, cap: number): Run {
  const limits = { maxSteps: cap, maxRepeats: cap, maxSeconds: 1e9, maxCents: 1e9 };
  const run = runLimited(task, callLlm, limits);
  if (run.stopped === "max-steps") run.stopped = "never-stopped";
  return run;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/15-stop-conditions");
  runLab(lab);
}
