// Lab 2: Guardrails and private details
//
// Dr. Lee types a note: "Patient: Jane Doe (SSN 123-45-6789) takes Cardioza. What is the dose?"
// The note holds private details. A model must never read them, and nothing may go out
// without an approved source. So we put one guardrail before the model and one after it.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/02-guardrails.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/02-guardrails.ts --question "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) on Cardioza dose" --naive
//   bun labs/02-guardrails.ts --question "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) on Cardioza dose"
//   bun labs/02-guardrails.ts --question "What is the dose of Cardioza?" --model nocite
//   bun labs/02-guardrails.ts --question "What is the dose of Zorbex?"
//   bun labs/02-guardrails.ts --demo

import { APPROVED_DOCS } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { runAgentLoop } from "./01-agent-loop"; // the loop from lab 1
import { hidePrivate } from "../src/phi";

export type Guarded = {
  clean: string;
  found: Found[];
  answer: string;
  check: Check;
  log: string[];
};

// Answer a doctor's note with a guardrail on each side of the model. Read the steps in order.
export function answerSafely(note: string, country: string, callLlm: CallLlm): Guarded {
  const log: string[] = [];

  // Step 1: hide the private details. The model must never see them.
  const { clean, found } = redactPhi(note);
  log.push(`Step 1: hid ${found.length} private pieces (${labelsOf(found).join(", ")}).`);
  log.push(`        The model will read: ${clean}`);

  // Step 2: let the model answer the clean note. This is the loop from lab 1.
  const answer = runAgentLoop(clean, country, callLlm).answer;
  log.push(`Step 2: the model wrote a reply: ${answer}`);

  // Step 3: check the reply. It must cite an approved document.
  const check = verifyOutput(answer, Object.keys(APPROVED_DOCS));

  // Step 4: send the reply, or block it.
  if (check.ok) log.push("Step 3: the reply cites an approved document.\nStep 4: sent.");
  else log.push(`Step 3: ${check.reason}\nStep 4: not sent.`);
  return { clean, found, answer, check, log };
}

// The same job with no guardrails. The model reads everything, and its reply goes out unchecked.
export function answerUnguarded(note: string, country: string, callLlm: CallLlm): Guarded {
  const log = [`Step 1: sent the note as it is. The model will read: ${note}`];
  const answer = runAgentLoop(note, country, callLlm).answer;
  log.push(`Step 2: the model wrote a reply: ${answer}`);
  log.push("Step 3: no check. Step 4: sent.");
  const found = redactPhi(note).found;
  return { clean: note, found, answer, check: { ok: true, reason: "" }, log };
}

// One private piece we found: what kind it is, and the words themselves.
export type Found = { label: string; text: string };

// The input guardrail: swap every private piece for a token. The patterns live in src/phi.ts.
export function redactPhi(raw: string): { clean: string; found: Found[] } {
  const { clean, found } = hidePrivate(raw);
  const pieces: Found[] = [];
  for (const piece of found) pieces.push({ label: piece.label, text: piece.text });
  return { clean, found: pieces };
}

// The kinds of private text we found, as a list of names.
export function labelsOf(found: Found[]): string[] {
  const labels: string[] = [];
  for (const item of found) labels.push(item.label);
  return labels;
}

// The output guardrail: the reply must cite a document, and every cited id must be approved.
export type Check = { ok: boolean; reason: string };

export function verifyOutput(draft: string, approvedIds: string[]): Check {
  const pieces = draft.split("[DOC-");
  if (pieces.length === 1) return { ok: false, reason: "BLOCKED: no approved source citation." };
  for (const piece of pieces.slice(1)) {
    const id = "DOC-" + piece.split("]")[0];
    if (!approvedIds.includes(id)) return { ok: false, reason: `BLOCKED: unknown source ${id}.` };
  }
  return { ok: true, reason: "" };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/02-guardrails");
  runLab(lab);
}
