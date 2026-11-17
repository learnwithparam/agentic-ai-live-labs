// Private data in a vault
//
// Dr. Lee sends a note about a patient. The note has a social security number and a phone number.
// The model must not read them. But the case record must keep them, and a reviewer must see them.
// So we swap each private piece for a token and keep the real value in a vault.
// The same value always gets the same token. Only the reviewer role may turn a token back.
// Every try to turn a token back is written in an audit file. That includes a try that is refused.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/37-phi-vault.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab phi-vault --question "Dr. Lee says Patient: Jane Doe (SSN 123-45-6789) takes Cardioza. What is the dose?" --role reviewer --naive
//   bun run lab phi-vault --question "Dr. Lee says Patient: Jane Doe (SSN 123-45-6789) takes Cardioza. What is the dose?" --role reviewer
//   bun run lab phi-vault --question "Dr. Lee says Patient: Jane Doe (SSN 123-45-6789) takes Cardioza. What is the dose?" --role agent
//   bun run lab phi-vault --question "Dr. Lee says Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) takes Cardioza. Please confirm SSN 123-45-6789 and the dose." --role agent
//   bun run lab phi-vault --demo

import { appendLine, readLines } from "../src/jobs";
import type { CallLlm } from "../src/model";
import { findPrivate, hidePrivate } from "../src/phi";
import { runLab } from "../src/runner";
import { runAgentLoop } from "./01-agent-loop";

export type Entry = { token: string; value: string; label: string };
export type Shown = { sentToModel: string; shown: string; revealed: number };
export const MAY_REVEAL = ["reviewer"];

// Write a case record for a note. Read the steps in order.
export type Asker = { role: string; who: string };

export function recordCase(note: string, asker: Asker, callLlm: CallLlm, dir: string): Shown {
  const { role, who } = asker;
  // Step 1: swap each private piece for a token. The real value stays in the vault.
  const clean = tokenize(note, dir);
  // Step 2: the model reads tokens only. This is the loop from the agent loop.
  const answer = runAgentLoop(clean, "US", callLlm).answer;
  const record = `Note: ${clean}\nAnswer: ${answer}`;
  // Step 3: turn tokens back only for a role that may see them.
  const shown = reveal(record, role, who, dir);
  return { sentToModel: clean, shown: shown.text, revealed: shown.revealed };
}

// Replace each private piece with a token. The same value gets the same token.
export function tokenize(note: string, dir: string): string {
  const file = `${dir}/vault.jsonl`;
  let clean = note;
  const pieces = findPrivate(note).reverse();
  for (const piece of pieces) {
    const token = tokenFor(file, piece.label, piece.text);
    clean = clean.slice(0, piece.start) + token + clean.slice(piece.end);
  }
  return clean;
}

function tokenFor(file: string, label: string, value: string): string {
  const entries: Entry[] = readLines(file);
  let count = 0;
  for (const entry of entries) {
    if (entry.value === value) return entry.token;
    if (entry.label === label) count += 1;
  }
  const token = `[${label.toUpperCase().replace(" ", "-")}-${count + 1}]`;
  appendLine(file, { token, value, label });
  return token;
}

// Put the real values back, but only for a reviewer. Every try is written down.
export function reveal(text: string, role: string, who: string, dir: string) {
  const entries: Entry[] = readLines(`${dir}/vault.jsonl`);
  const present: Entry[] = [];
  for (const entry of entries) if (text.includes(entry.token)) present.push(entry);
  if (present.length === 0) return { text, revealed: 0 };
  // Step 4: write the audit line first. A refused try is written too.
  const allowed = MAY_REVEAL.includes(role);
  appendLine(`${dir}/audit.jsonl`, { who, role, allowed, tokens: present.length });
  // Step 5: a role that may not reveal gets the tokens back, not the values.
  if (!allowed) return { text, revealed: 0 };
  let shown = text;
  for (const entry of present) shown = shown.split(entry.token).join(entry.value);
  return { text: shown, revealed: present.length };
}

// The naive way: a fixed mask. Nothing is stored, so nobody can ever get the value back.
export function recordNaive(note: string, callLlm: CallLlm): Shown {
  const clean = hidePrivate(note).clean;
  const answer = runAgentLoop(clean, "US", callLlm).answer;
  return { sentToModel: clean, shown: `Note: ${clean}\nAnswer: ${answer}`, revealed: 0 };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/37-phi-vault");
  runLab(lab);
}
