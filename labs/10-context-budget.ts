// Lab 10: The context budget
//
// Dr. Lee asks: "What is the Cardioza dose?" The model reads a prompt: our rules, a note about the
// doctor, the approved documents, the chat so far, and the question. A model reads only a limited
// amount of text each turn. That limit is the window. The prompt must fit. So we count what goes in,
// keep what must stay, and drop the least useful parts first.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/10-context-budget.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/10-context-budget.ts --question "Cardioza dose" --naive --window 60
//   bun labs/10-context-budget.ts --question "Cardioza dose" --window 200
//   bun labs/10-context-budget.ts --question "Cardioza dose" --window 70
//   bun labs/10-context-budget.ts --question "Cardioza dose" --window 40
//   bun labs/10-context-budget.ts --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";

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

// A rough count: one token is about four letters. Real systems use the model's own counter.
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Keep the must parts. Then add the other parts in order, and drop any that no longer fit.
export function buildPrompt(parts: Part[], budget: number): Built {
  let used = 0;
  const keep: Record<string, boolean> = {};
  for (const part of parts) {
    if (!part.must) continue;
    used += countTokens(part.text);
    keep[part.name] = true;
  }
  if (used > budget) return { prompt: "", used, kept: [], dropped: [], fits: false };

  for (const part of parts) {
    if (part.must) continue;
    const cost = countTokens(part.text);
    if (used + cost > budget) continue;
    used += cost;
    keep[part.name] = true;
  }

  const kept: string[] = [];
  const dropped: string[] = [];
  let prompt = "";
  for (const part of parts) {
    if (keep[part.name]) {
      kept.push(part.name);
      prompt += part.text + "\n";
    } else dropped.push(part.name);
  }
  return { prompt, used, kept, dropped, fits: true };
}

// The naive way: join everything and let the window cut the oldest text, which comes first.
export function naiveWindow(parts: Part[], budget: number): string {
  let all = "";
  for (const part of parts) all += part.text + "\n";
  return all.slice(Math.max(0, all.length - budget * 4));
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/10-context-budget");
  runLab(lab);
}
