// Money caps
//
// A model that is stuck keeps calling a paid model. The stop conditions lab stopped it by counting tokens.
// A company pays in money, not tokens, and one person can start many runs in a day.
// So we keep three caps in whole cents: one for a run, one for a person's day, one for the hops.
// A hop is one agent handing work to another. Too many hops means two agents are passing a ball.
// We check the cap before each call, using the worst case cost. A call never starts if it may not fit.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/22-budgets.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab budgets --question "What is the dose of Zorbex?" --model stuck --naive
//   bun run lab budgets --question "What is the dose of Cardioza?"
//   bun run lab budgets --question "What is the dose of Zorbex?" --model stuck --run 1
//   bun run lab budgets --question "What is the dose of Cardioza?" --before 2900
//   bun run lab budgets --question "What is the dose of Cardioza?" --hops 3
//   bun run lab budgets --question "What is the dose of Cardioza?" --again 3
//   bun run lab budgets --demo

import type { CallLlm, Message } from "../src/model";
import { runLab } from "../src/runner";
import { charge, costOf, PRICES, spentOn } from "../src/spend"; // money in whole millicents
import { countTokens } from "./10-context-budget"; // the estimate, used when the provider sends no count
import { searchApprovedDocs } from "./01-agent-loop";

export type Caps = { run: number; day: number; hops: number; rounds: number; maxOut: number };
export type Who = { user: string; day: string; hops: number };
export type Run = { answer: string; stopped: string; rounds: number; cost: number; log: string[] };

// Run the loop inside three caps. Every way out says why it stopped. Read the steps in order.
export function runWithBudget(
  question: string,
  country: string,
  callLlm: CallLlm,
  caps: Caps,
  who: Who,
): Run {
  const log: string[] = [];
  let cost = 0;

  // Step 1: a run handed over by another agent carries a hop count. At the cap, refuse.
  if (who.hops >= caps.hops) return stop("hop-cap", 0, cost, log);
  log.push(`Step 1: hop ${who.hops} of ${caps.hops}. Fine.`);

  // Step 2: read what this person has spent today. It is on disk, so a restart cannot hide it.
  const before = spentOn(who.user, who.day);
  log.push(`Step 2: ${who.user} spent ${before} millicents today. The day cap is ${caps.day}.`);

  const messages: Message[] = [
    { role: "system", content: "Use ONLY the approved documents. Cite their ids." },
    { role: "user", content: `Country: ${country}. HCP: none. Question: ${question}` },
  ];
  for (let round = 1; round <= caps.rounds; round++) {
    // Step 3: price the worst case before the call: this prompt plus the longest answer we allow.
    const worst = costOf(PRICES.big, tokensIn(messages), caps.maxOut);
    if (cost + worst > caps.run) return stop("run-cap", round, cost, log);
    if (before + cost + worst > caps.day) return stop("day-cap", round, cost, log);

    // Step 4: ask the model, then charge what the call really cost, and write it down at once.
    const reply = callLlm(messages, ["search_approved_docs"]);
    const guess = { tokensIn: tokensIn(messages), tokensOut: countTokens(reply.text || "") };
    const used = reply.usage || guess;
    const paid = costOf(PRICES.big, used.tokensIn, used.tokensOut);
    cost += paid;
    charge(who.user, who.day, paid);
    log.push(`Step 4: round ${round} cost ${paid} millicents. Run total ${cost}.`);
    if (!reply.toolCall) return finish(reply.text || "", round, cost, log);

    // Step 5: run the tool, and show the model what it returned.
    const call = reply.toolCall;
    const found = searchApprovedDocs(call.args.query, call.args.country);
    messages.push({ role: "tool", name: call.name, content: found });
  }
  return stop("max-steps", caps.rounds, cost, log);
}

function tokensIn(messages: Message[]): number {
  let tokens = 0;
  for (const message of messages) tokens += countTokens(message.content);
  return tokens;
}

function finish(answer: string, rounds: number, cost: number, log: string[]): Run {
  log.push(`Done: the model answered on round ${rounds}.`);
  return { answer, stopped: "answered", rounds, cost, log };
}

function stop(why: string, rounds: number, cost: number, log: string[]): Run {
  log.push(`Stopped: ${why}, on round ${rounds}.`);
  return { answer: `STOPPED: ${why}`, stopped: why, rounds, cost, log };
}

// The naive way: no money cap. We trust the model to stop. The demo cuts it at 200 rounds.
export function runUncapped(question: string, country: string, callLlm: CallLlm, who: Who): Run {
  const caps = { run: 1e12, day: 1e12, hops: 99, rounds: 200, maxOut: 100 };
  const run = runWithBudget(question, country, callLlm, caps, who);
  if (run.stopped === "max-steps") run.stopped = "never-stopped";
  return run;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/22-budgets");
  runLab(lab);
}
