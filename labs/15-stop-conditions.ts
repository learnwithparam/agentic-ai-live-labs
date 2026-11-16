// Lab 15: When the loop must stop
//
// Dr. Lee asks about a drug that has no approved document. The model searches, finds nothing, and
// searches again with other words. A model that is stuck never says it is done. A loop that trusts
// the model runs and bills forever. So the loop needs three limits of its own.
// Each round sends the whole chat again, so each round costs more than the one before.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/15-stop-conditions.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/15-stop-conditions.ts --question "Zorbex dose" --model stuck --naive
//   bun labs/15-stop-conditions.ts --question "Cardioza dose"
//   bun labs/15-stop-conditions.ts --question "Zorbex dose" --model stuck
//   bun labs/15-stop-conditions.ts --question "Zorbex dose" --model wanders
//   bun labs/15-stop-conditions.ts --question "Cardioza dose" --budget 20
//   bun labs/15-stop-conditions.ts --demo

import type { CallLlm, Message } from "../src/model";
import { runLab } from "../src/runner";
import { countTokens } from "./10-context-budget"; // the counter from lab 10
import { searchApprovedDocs } from "./01-agent-loop"; // the search from lab 1

export type Limits = { maxSteps: number; maxRepeats: number; budget: number };
export type Run = { answer: string; stopped: string; steps: number; spent: number; log: string[] };

// Run the loop with three limits. Every way out says why it stopped. Read the steps in order.
export function runLimited(
  question: string,
  country: string,
  callLlm: CallLlm,
  limits: Limits,
): Run {
  const log: string[] = [];
  const seen: string[] = [];
  let spent = 0;

  // Step 1: start the chat with the rules and the question.
  const messages: Message[] = [
    { role: "system", content: "Use ONLY the approved documents. Cite their ids." },
    { role: "user", content: `Country: ${country}. HCP: none. Question: ${question}` },
  ];
  const { maxSteps, maxRepeats, budget } = limits;
  log.push(`Step 1: limits are ${maxSteps} steps, ${maxRepeats} repeats, ${budget} tokens.`);

  for (let step = 1; step <= limits.maxSteps; step++) {
    // Step 2: pay for this round. The whole chat is sent again, so the cost grows.
    spent += tokensIn(messages);
    if (spent > limits.budget) return stop("out-of-budget", step, spent, log);

    // Step 3: ask the model. If it gives an answer, we are done.
    const reply = callLlm(messages, ["search_approved_docs"]);
    if (!reply.toolCall) return finish(reply.text || "", step, spent, log);

    // Step 4: the same call again and again means the model is stuck. Stop it.
    const call = reply.toolCall;
    const key = `${call.name}: ${call.args.query}`;
    if (countOf(seen, key) >= limits.maxRepeats) return stop("repeat", step, spent, log);
    seen.push(key);

    // Step 5: run the tool and show the model what it returned.
    const result = searchApprovedDocs(call.args.query, call.args.country);
    messages.push({ role: "tool", name: call.name, content: result });
    log.push(`Step 5: round ${step} used the tool with "${call.args.query}". Spent ${spent}.`);
  }

  // Step 6: too many rounds. Stop, whatever the model wants.
  return stop("max-steps", limits.maxSteps, spent, log);
}

function tokensIn(messages: Message[]): number {
  let tokens = 0;
  for (const message of messages) tokens += countTokens(message.content);
  return tokens;
}

function countOf(list: string[], key: string): number {
  let count = 0;
  for (const item of list) {
    if (item === key) count += 1;
  }
  return count;
}

function finish(answer: string, steps: number, spent: number, log: string[]): Run {
  log.push(`Done: the model answered on round ${steps}.`);
  return { answer, stopped: "answered", steps, spent, log };
}

function stop(why: string, steps: number, spent: number, log: string[]): Run {
  log.push(`Stopped: ${why}, on round ${steps}.`);
  return { answer: `STOPPED: ${why}`, stopped: why, steps, spent, log };
}

// The naive way: no limit of our own. We trust the model to stop. The demo cuts it at a cap.
export function runUnlimited(
  question: string,
  country: string,
  callLlm: CallLlm,
  cap: number,
): Run {
  const limits = { maxSteps: cap, maxRepeats: cap, budget: 1000000 };
  const run = runLimited(question, country, callLlm, limits);
  if (run.stopped === "max-steps") run.stopped = "never-stopped";
  return run;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/15-stop-conditions");
  runLab(lab);
}
