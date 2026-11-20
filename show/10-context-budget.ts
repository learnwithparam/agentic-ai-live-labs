// What you see on screen for the context budget lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/10-context-budget.ts.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { countTokens, prepareRenewal, RULES, type Phase, type Prepared } from "../labs/10-context-budget";
import type { CallLlm } from "../src/model";
import { KEY_CLAUSE, renewalCalls, renewalContract, renewalMail } from "../src/renewal";

const PRICE_PER_MILLION = 3; // dollars for a million input tokens, a round number for the lesson
const ASK = "How much can we raise Acme's price at renewal?";

function phases(): Phase[] {
  return [
    { name: "mail", result: renewalMail() },
    { name: "contract", result: renewalContract() },
    { name: "calls", result: renewalCalls() },
  ];
}

// The naive way: every result goes in whole. Every turn sends it all again.
export function prepareNaive(phases: Phase[], question: string, callLlm: CallLlm): Prepared {
  const out: Prepared = { reply: "", billed: 0, sizes: [], log: [], fits: true, folded: 0 };
  let all = RULES + "\n";
  for (const phase of phases) {
    all += phase.result + "\n";
    out.billed += countTokens(all);
    out.sizes.push(countTokens(all));
  }
  const final = `${all}QUESTION: ${question}`;
  out.billed += countTokens(final);
  const reply = callLlm([{ role: "user", content: `RENEW: ${final}` }], []);
  out.reply = (reply.text || "").trim();
  return out;
}

function cost(tokens: number): string {
  return `$${((tokens * PRICE_PER_MILLION) / 1_000_000).toFixed(4)}`;
}

export const lab: Lab = {
  file: "10-context-budget.ts",
  title: "The context budget",
  about:
    "Each example preps a renewal for Acme Dental. The file holds mail, call notes and a contract. Use --window to change the size of the context window. Use --naive to put it all in. The answer must name the price limit in clause 7.",
  terms: ["context-window", "model-token", "compaction", "receipt"],
  challenge: "Every turn sends the whole prompt again, so the bill grows. A long prompt also hides its middle. The key clause sits in the middle, and the bot says there is no limit.",
  promise: "Our code counts model tokens. A big result becomes a receipt. Compaction folds old phases into notes at 40 percent. The key clause is read back from disk.",
  production: "Count tokens in your own code, not in the model. Save every big result to disk and keep a receipt in the prompt. Fold old phases into notes at 40 percent.",
  cases: [
    { title: "NAIVE: put the whole file in", why: "Three years of mail, the notes and the contract all go in. Clause 7 lands in the middle. The model says there is no limit.", question: ASK, flags: { naive: "true" }, expect: "clause-lost" },
    { title: "A roomy window", why: "The mail becomes a receipt. The calls and the contract fit, so nothing is folded. The clause is read back.", question: "Maya calls Sam tomorrow. What is the price limit?", flags: { window: "6000" }, expect: "answered" },
    { title: "A tight window", why: "Old phases fold into one-line notes. The full contract is still on disk. The question needs it, so it is read back.", question: "Is there a cap on the renewal price?", flags: { window: "2000" }, expect: "compacted" },
    { title: "A different question: the last call", why: "This question needs the call notes, not the contract. Our code reads back the notes and leaves the contract on disk.", question: "What did Maya promise Sam on the last call?", flags: { window: "6000" }, expect: "answered" },
    { title: "A very tight window", why: "Almost everything folds. The contract is read back whole, and it is the only text that must fit.", question: "What does clause 7 say about the price?", flags: { window: "1200" }, expect: "compacted" },
    { title: "EDGE: the window is too small", why: "The contract alone is bigger than 500 tokens. We say so. We never send a prompt that does not fit.", question: "What does clause 7 say about the price?", flags: { window: "500" }, expect: "too-small" },
  ],
  play(question, flags) {
    process.env.NOTES_DIR = mkdtempSync(`${tmpdir()}/lab10-`);
    const window = Number(flags.window || 6000);
    print(field("Question", question));
    if (flags.naive) return showNaive(question, flags);
    print(field("Window", `${window} tokens, fold at ${Math.round(window * 0.4)}`));
    const run = prepareRenewal(phases(), question, window, modelFrom(flags));
    rule("LOG, STEP BY STEP");
    for (const line of run.log) console.log(dim(line));
    console.log();
    if (!run.fits) {
      box("TOO SMALL", [red(`The prompt needs more than ${window} tokens. Make the window bigger.`)], red);
      return "too-small";
    }
    print(field("Billed", `${run.billed} tokens, ${cost(run.billed)}`, green));
    print(field("Answer", run.reply));
    return run.folded > 0 ? "compacted" : "answered";
  },
};

function showNaive(question: string, flags: Record<string, string>): string {
  const run: Prepared = prepareNaive(phases(), question, modelFrom(flags));
  rule("WHAT EACH TURN SENDS");
  for (const size of run.sizes) console.log(dim(`${size} tokens`));
  print(field("Billed", `${run.billed} tokens, ${cost(run.billed)}`, yellow));
  print(field("Answer", run.reply));
  const lost = !run.reply.includes(KEY_CLAUSE);
  const badge = lost ? badgeRed("CLAUSE LOST") : badgeGreen("CLAUSE FOUND");
  box(badge, [yellow(lost ? "The bot said there is no limit. The limit is 4 percent." : "This time it found the clause.")], yellow);
  return lost ? "clause-lost" : "answered";
}
