// The context budget
//
// The Account Manager bot preps Maya for Acme Dental's renewal. The file holds three years of mail,
// a year of call notes and the contract. Each tool result goes into the prompt, and the whole
// prompt is sent again on every turn. The cost grows. A long prompt also hides its middle.
// The one clause that matters sits in the middle of the contract.
// So our code counts model tokens, not the model. It shrinks big results to a one-line receipt.
// Compaction folds old phases into short notes at 40 percent of the window. Full text stays on disk.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/10-context-budget.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab context-budget --question "How much can we raise Acme's price at renewal?" --naive
//   bun run lab context-budget --question "Maya calls Sam tomorrow. What is the price limit?" --window 6000
//   bun run lab context-budget --question "Is there a cap on the renewal price?" --window 2400
//   bun run lab context-budget --question "What does clause 7 say about the price?" --window 500
//   bun run lab context-budget --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { encode } from "gpt-tokenizer/encoding/o200k_base";
import { phasesNeeded } from "../src/renewal";
import { readNote, saveNote } from "../src/notes";

export const COMPACT_AT = 0.4; // collapse old phases when the context holds this much of the window
export const BIG_RESULT = 600; // a tool result over this many tokens becomes a one-line receipt
export const RULES = "RULES: Answer from the file only. Quote the clause you used.";

export type Phase = { name: string; result: string };
export type Slot = { name: string; text: string; note: string };
export type Prepared = {
  reply: string;
  billed: number;
  sizes: number[];
  log: string[];
  fits: boolean;
  folded: number;
};

// A real token count. The tokenizer runs on this machine, so it needs no key.
export function countTokens(text: string): number {
  return encode(text).length;
}

// Work through the phases, then answer. Read the steps in order.
export function prepareRenewal(
  phases: Phase[],
  question: string,
  window: number,
  callLlm: CallLlm,
): Prepared {
  const slots: Slot[] = [];
  const out: Prepared = { reply: "", billed: 0, sizes: [], log: [], fits: true, folded: 0 };
  for (const phase of phases) {
    // Step 1: a big result is saved in full. The prompt gets a one-line receipt.
    const shown = shrink(phase);
    const before = countTokens(phase.result);
    out.log.push(`Step 1: ${phase.name}: ${before} tokens, shown as ${countTokens(shown)}.`);

    // Step 2: the model writes a one-line note for the phase. Our code counts what is sent.
    const prompt = `RENEWNOTE: Write one line.\nCONTEXT:\n${join(slots)}\nNEW:\n${shown}`;
    out.billed += countTokens(prompt);
    const note = ask(callLlm, prompt);
    slots.push({ name: phase.name, text: shown, note });

    // Step 3: over 40 percent of the window, the oldest phases become their notes.
    const folded = compact(slots, window * COMPACT_AT);
    out.folded += folded;
    out.sizes.push(countTokens(join(slots)));
    out.log.push(`Step 3: folded ${folded}. The context holds ${countTokens(join(slots))} tokens.`);
  }

  // Step 4: read back only the full notes this question needs.
  const wanted = phasesNeeded(question);
  let readBack = "";
  for (const name of wanted) readBack += readNote(name) + "\n";
  const final = `${RULES}\n${join(slots)}\nFILE:\n${readBack}QUESTION: ${question}`;
  const size = countTokens(final);
  const names = wanted.join(", ") || "nothing";
  out.log.push(`Step 4: read back ${names}. The prompt holds ${size} tokens.`);
  out.billed += size;
  out.fits = size <= window;
  if (out.fits) out.reply = ask(callLlm, `RENEW: ${final}`);
  return out;
}

// Save the full result. If it is big, the prompt only gets a receipt that says where it is.
function shrink(phase: Phase): string {
  saveNote(phase.name, phase.result);
  const size = countTokens(phase.result);
  if (size <= BIG_RESULT) return phase.result;
  return `[receipt] ${phase.name}: ${size} tokens, saved in notes/${phase.name}.txt`;
}

function join(slots: Slot[]): string {
  let text = "";
  for (const slot of slots) text += slot.text + "\n";
  return text;
}

// Oldest first: swap a phase for its note until the context is under the limit.
function compact(slots: Slot[], limit: number): number {
  let folded = 0;
  for (const slot of slots) {
    if (countTokens(join(slots)) <= limit) break;
    if (slot.text === slot.note) continue;
    slot.text = slot.note;
    folded += 1;
  }
  return folded;
}

function ask(callLlm: CallLlm, prompt: string): string {
  const reply = callLlm([{ role: "user", content: prompt }], []);
  return (reply.text || "").trim();
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/10-context-budget");
  runLab(lab);
}
