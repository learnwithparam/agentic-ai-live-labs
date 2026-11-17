// The context budget
//
// Dr. Lee asks: "What is the Cardioza dose?" The model reads a prompt: our rules, a note about the
// doctor, the approved documents, the chat so far, and the question. A model reads only a limited
// amount of text each turn. That limit is the window. The prompt must fit. So we count what goes in,
// keep what must stay, and drop the least useful parts first.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/10-context-budget.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab context-budget --question "What is the dose of Cardioza?" --naive --window 60
//   bun run lab context-budget --question "What is the dose of Cardioza?" --window 200
//   bun run lab context-budget --question "What is the dose of Cardioza?" --window 70
//   bun run lab context-budget --question "What is the dose of Cardioza?" --window 40
//   bun run lab context-budget --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { decode, encode } from "gpt-tokenizer/encoding/o200k_base";

// A part of the prompt. "must" parts are never dropped.
export type Part = { name: string; text: string; must: boolean };
export type Built = {
  prompt: string;
  used: number;
  kept: string[];
  dropped: string[];
  fits: boolean;
};

export type Asked = { built: Built; reply: string; log: string[] };

// Fit the prompt to the window, then let the model answer from it. Read the steps in order.
export function askWithinBudget(parts: Part[], budget: number, callLlm: CallLlm): Asked {
  // Step 1: build the prompt. The must parts stay. The other parts are kept while they fit.
  const built = buildPrompt(parts, budget);
  const log = [`Step 1: the window is ${budget} tokens. The prompt uses ${built.used}.`];
  const kept = built.kept.join(", ") || "nothing";
  const dropped = built.dropped.join(", ") || "nothing";
  log.push(`Step 2: kept ${kept}. Dropped ${dropped}.`);
  if (!built.fits) return { built, reply: "", log };

  // Step 3: the model answers from what is left in the prompt.
  const reply = callLlm([{ role: "user", content: `ANSWER: ${built.prompt}` }], []);
  const text = (reply.text || "").trim();
  log.push(`Step 3: the model wrote: ${text}`);
  return { built, reply: text, log };
}

// A real token count. The tokenizer runs on this machine, so it needs no key.
// Each model has its own tokenizer. A count for another model is close, but not exact.
export function countTokens(text: string): number {
  return encode(text).length;
}

function join(parts: Part[], keep: Record<string, boolean>): string {
  let prompt = "";
  for (const part of parts) if (keep[part.name]) prompt += part.text + "\n";
  return prompt;
}

// Keep the must parts. Then add the other parts in order, and drop any that no longer fit.
// Each count is of the whole prompt, because tokens do not add up part by part.
export function buildPrompt(parts: Part[], budget: number): Built {
  const keep: Record<string, boolean> = {};
  for (const part of parts) if (part.must) keep[part.name] = true;
  if (countTokens(join(parts, keep)) > budget) {
    return { prompt: "", used: countTokens(join(parts, keep)), kept: [], dropped: [], fits: false };
  }

  for (const part of parts) {
    if (part.must) continue;
    keep[part.name] = true;
    const tryIt = join(parts, keep);
    if (countTokens(tryIt) > budget) keep[part.name] = false;
  }

  const kept: string[] = [];
  const dropped: string[] = [];
  for (const part of parts) {
    if (keep[part.name]) kept.push(part.name);
    else dropped.push(part.name);
  }
  const prompt = join(parts, keep);
  return { prompt, used: countTokens(prompt), kept, dropped, fits: true };
}

// The naive way: join everything and let the window cut the oldest text, which comes first.
export function naiveWindow(parts: Part[], budget: number): string {
  let all = "";
  for (const part of parts) all += part.text + "\n";
  const tokens = encode(all);
  return decode(tokens.slice(Math.max(0, tokens.length - budget)));
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/10-context-budget");
  runLab(lab);
}
