// Which model answers
//
// A strong model costs ten times more than a small one. Most jobs are easy.
// The Inbox Manager at Juniper Studio sorts 500 emails a week. A small model does that well.
// Then it must reply to the signed Acme contract, and the total must be right.
// So the small model goes first, and our code checks the reply. A bad try goes back with the problems.
// A junior who fails twice asks a senior. Here the strong model is the senior.
// We route each job to a model. Small first, then strong, is called a cascade.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/23-model-routing.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab model-routing --question "Sort 500 emails, then reply to Acme" --mail mail-contract --naive
//   bun run lab model-routing --question "Reply to the signed Acme contract" --mail mail-contract
//   bun run lab model-routing --question "Reply to the signed Acme contract" --mail mail-contract --small nocite
//   bun run lab model-routing --question "Reply to the signed Acme contract" --mail mail-contract --small invent
//   bun run lab model-routing --demo

import type { CallLlm, Reply } from "../src/model";
import { runLab } from "../src/runner";
import { costOf, PRICES } from "../src/spend"; // prices in whole millicents, from the budgets lab
import { countTokens } from "./10-context-budget"; // the estimate, used when the provider sends no count
import { bigInbox, draftReply, mailById, remembered, replyProblems, sortInbox } from "../src/juniper";

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

// Sort the inbox on the small model, then draft the reply. A failed check moves the job up.
export function answerRouted(mailId: string, small: CallLlm, big: CallLlm, count = 500): Routed {
  const log: string[] = [];
  const meters = { small: newMeter(), big: newMeter() };
  const mail = mailById(mailId);
  let body = "";
  if (mail) body = mail.body;
  const cheap = metered(remembered(small), meters.small);

  // Step 1: the small model sorts every email. This is easy work, and it is most of the volume.
  log.push(`Step 1: the small model sorted ${count} emails: ${sortInbox(bigInbox(count), cheap)}.`);

  // Step 2: the small model drafts the reply. Our code checks it against the email.
  const first = draftReply(mailId, cheap);
  const problems = replyProblems(first, body);
  log.push(`Step 2: small try 1. Check: ${problems.join("; ") || "no problems"}.`);

  // Step 3: a clean reply is sent as it is. The strong model is never called.
  if (problems.length === 0) return done(first, "small", meters, log);

  // Step 4: the small model tries again, and this time it is told the problems.
  const second = draftReply(mailId, cheap, problems);
  const retry = replyProblems(second, body);
  log.push(`Step 4: small try 2. Check: ${retry.join("; ") || "no problems"}.`);
  if (retry.length === 0) return done(second, "small-retry", meters, log);

  // Step 5: two failures. The strong model drafts it, and it is checked too.
  const third = draftReply(mailId, metered(big, meters.big), retry);
  const again = replyProblems(third, body);
  log.push(`Step 5: the strong model drafted. Check: ${again.join("; ") || "no problems"}.`);
  if (again.length === 0) return done(third, "big", meters, log);

  // Step 6: all three failed. Say so. Maya looks at it.
  log.push("Step 6: no model gave a checked reply. Nothing is sent.");
  return done("NOT SENT: no model gave a checked reply.", "refused", meters, log);
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

// The naive way: sort and draft on the strong model, and nobody checks the reply.
export function answerAlwaysBig(mailId: string, big: CallLlm, count = 500): Routed {
  const meter = newMeter();
  const strong = metered(remembered(big), meter);
  const sorted = sortInbox(bigInbox(count), strong);
  const answer = draftReply(mailId, strong);
  const cost = costOf(PRICES.big, meter.tokensIn, meter.tokensOut);
  const log = [`Sorted ${count} emails: ${sorted}.`];
  log.push(`Everything goes to the strong model: ${cost} millicents.`);
  return { answer, tier: "always-big", cost, bigOnly: cost, log };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/23-model-routing");
  runLab(lab);
}
