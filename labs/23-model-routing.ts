// Lab 23: Which model answers
//
// A strong model costs ten times more than a small one. Most questions are easy.
// Sending every question to the strong model wastes money. Sending every one to the small model
// puts a wrong dose in front of a doctor. So the small model goes first, and our code checks its answer.
// A good answer is sent as it is. A bad answer goes to the strong model, and is checked again.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/23-model-routing.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/23-model-routing.ts --question "What is the dose of Cardioza?" --naive
//   bun labs/23-model-routing.ts --question "What is the dose of Cardioza?"
//   bun labs/23-model-routing.ts --question "What is the dose of Cardioza?" --small nocite
//   bun labs/23-model-routing.ts --question "What is the dose of Cardioza?" --small invent
//   bun labs/23-model-routing.ts --question "What is the dose of Cardioza?" --small nocite --big nocite
//   bun labs/23-model-routing.ts --question "What is the dose of Zorbex?"
//   bun labs/23-model-routing.ts --demo

import { NO_DOC } from "../src/data";
import type { CallLlm, Reply } from "../src/model";
import { runLab } from "../src/runner";
import { dosesIn, findProblems } from "../src/draft-check"; // the answer check from lab 18
import { costOf, PRICES } from "../src/spend"; // prices in whole millicents, from lab 22
import { countTokens } from "./10-context-budget"; // the estimate, used when the provider sends no count
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop"; // lab 1

export type Meter = { calls: number; tokensIn: number; tokensOut: number };
export type Routed = { answer: string; tier: string; cost: number; bigOnly: number; log: string[] };

// Wrap a model so that every call is counted. The counts come from the provider when it sends them.
export function metered(callLlm: CallLlm, meter: Meter): CallLlm {
  return function (messages, toolNames): Reply {
    const reply = callLlm(messages, toolNames);
    let tokensIn = 0;
    for (const message of messages) tokensIn += countTokens(message.content);
    const guess = { tokensIn, tokensOut: countTokens(reply.text || "") };
    const used = reply.usage || guess;
    meter.calls += 1;
    meter.tokensIn += used.tokensIn;
    meter.tokensOut += used.tokensOut;
    return reply;
  };
}

// The check lives in our code, not in a model. With no approved source, a dose is a made up dose.
export function checkAnswer(answer: string, source: string): string[] {
  if (source !== NO_DOC && source !== "") return findProblems(answer, source);
  const problems: string[] = [];
  for (const dose of dosesIn(answer)) problems.push(`dose ${dose} but there is no approved source`);
  return problems;
}

// Answer with the small model first, and the strong model only when the check fails.
export function answerRouted(
  question: string,
  country: string,
  small: CallLlm,
  big: CallLlm,
): Routed {
  const log: string[] = [];
  const meters = { small: newMeter(), big: newMeter() };

  // Step 1: find what a good answer must match. This is the approved text for the question.
  const source = searchApprovedDocs(question, country);
  log.push(`Step 1: the source is ${source.split("\n")[0].slice(0, 50) || NO_DOC}.`);

  // Step 2: ask the small model first. It is cheap.
  const first = runAgentLoop(question, country, metered(small, meters.small)).answer;
  const problems = checkAnswer(first, source);
  log.push(`Step 2: the small model answered. Check: ${problems.join("; ") || "no problems"}.`);

  // Step 3: a clean answer is sent as it is. The strong model is never called.
  if (problems.length === 0) return done(first, "small", meters, log);

  // Step 4: a bad answer goes to the strong model. We never send the bad one.
  const second = runAgentLoop(question, country, metered(big, meters.big)).answer;
  const again = checkAnswer(second, source);
  log.push(`Step 4: the strong model answered. Check: ${again.join("; ") || "no problems"}.`);
  if (again.length === 0) return done(second, "big", meters, log);

  // Step 5: both failed. Say so. A person looks at it.
  log.push("Step 5: both models failed the check. Nothing is sent.");
  return done("NOT SENT: no model gave a checked answer.", "refused", meters, log);
}

function newMeter(): Meter {
  return { calls: 0, tokensIn: 0, tokensOut: 0 };
}

// The money for each tier, and what the same tokens would have cost on the strong model alone.
function done(
  answer: string,
  tier: string,
  meters: Record<string, Meter>,
  log: string[],
): Routed {
  const small = meters.small;
  const big = meters.big;
  const cost = costOf(PRICES.small, small.tokensIn, small.tokensOut)
    + costOf(PRICES.big, big.tokensIn, big.tokensOut);
  const allIn = small.tokensIn + big.tokensIn;
  const bigOnly = costOf(PRICES.big, allIn, small.tokensOut + big.tokensOut);
  log.push(`Done: ${tier}. It cost ${cost} millicents. The strong model alone: ${bigOnly}.`);
  return { answer, tier, cost, bigOnly, log };
}

// The naive way: every question goes to the strong model, and nobody checks the answer.
export function answerAlwaysBig(question: string, country: string, big: CallLlm) {
  const meter = newMeter();
  const answer = runAgentLoop(question, country, metered(big, meter)).answer;
  const cost = costOf(PRICES.big, meter.tokensIn, meter.tokensOut);
  const log = [`Every question goes to the strong model. It cost ${cost} millicents.`];
  return { answer, tier: "always-big", cost, bigOnly: cost, log };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/23-model-routing");
  runLab(lab);
}
