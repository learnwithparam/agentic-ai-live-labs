// LAB 18: CHECK THE DRAFT, THEN FIX IT
//
// Dr. Lee asks for the Cardioza dose. The model writes a draft. The draft might be wrong.
// So we check the draft before we show it. If it is wrong, the model gets two tries to fix it.
// The run prints each step as it happens, with the same number as the step in the code.
// The pretend model and the screen output are in show/18-reflect-and-fix.ts. You can skip them.
//
// Run it (copy any line):
//   bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model invent --naive
//   bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?"
//   bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model nocite
//   bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model invent
//   bun labs/18-reflect-and-fix.ts --demo

import { NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop"; // lab 1

export const MOST_ROUNDS = 2;
export type FixDraft = { (draft: string, problems: string[], source: string): string }; // the model
export type Result = { outcome: string; draft: string; problems: string[]; path: string[] };

// Answer a question, but check the draft first. Read the steps in order.
export function answerWithCheck(
  question: string,
  country: string,
  callLlm: CallLlm,
  fixDraft: FixDraft,
): Result {
  const path: string[] = [];

  // Step 1: find the approved document. The check needs it.
  const source = searchApprovedDocs(question, country);
  path.push(`Step 1: searched the approved documents. Found ${source.split("\n")[0]}`);

  // Step 2: no document means nothing to check against. Say so. Never guess.
  if (source === NO_DOC) {
    path.push("Step 2: no approved document, so there is nothing to check against. Stop.");
    return { outcome: "no-source", draft: "", problems: [], path };
  }

  // Step 3: the model writes a first draft (lab 1's agent loop).
  let draft = runAgentLoop(question, country, callLlm).answer;
  path.push(`Step 3: the model wrote a draft. ${draft}`);

  // Step 4: check the draft with plain code and the document. We do not ask the model.
  let problems = findProblems(draft, source);
  path.push(`Step 4: checked the draft. Problems: ${problems.join(", ") || "none"}`);
  if (problems.length === 0) return { outcome: "accepted", draft, problems, path };

  // Step 5: tell the model what is wrong, and let it fix the draft. Then check again.
  for (let round = 1; round <= MOST_ROUNDS; round++) {
    draft = fixDraft(draft, problems, source);
    path.push(`Step 5: fix round ${round}. The model rewrote it. ${draft}`);
    problems = findProblems(draft, source);
    path.push(`Step 4 again: checked the new draft. Problems: ${problems.join(", ") || "none"}`);

    // Step 6: a clean draft is done.
    if (problems.length === 0) {
      path.push("Step 6: the draft is clean. Done.");
      return { outcome: "fixed", draft, problems, path };
    }
  }

  // Step 7: still wrong after two rounds. Stop. A person decides.
  path.push("Step 7: still wrong after the last round. A person decides.");
  return { outcome: "gave-up", draft, problems, path };
}

// The naive way: ask the same model if its draft is fine. It has no new facts, so it says yes.
export function answerWithoutCheck(question: string, country: string, callLlm: CallLlm): Result {
  const draft = runAgentLoop(question, country, callLlm).answer;
  const path = [`The model wrote a draft. ${draft}`];
  path.push("We asked the same model: is this draft fine?");
  path.push("The model said: looks good. Nothing was checked.");
  return { outcome: "self-approved", draft, problems: [], path };
}

// The next two functions do the check in Step 4.

// List what is wrong with a draft. An empty list means the draft is good.
export function findProblems(draft: string, source: string): string[] {
  const problems: string[] = [];
  if (!draft.includes("[DOC-")) problems.push("no citation");
  for (const dose of dosesIn(draft)) {
    if (!dosesIn(source).includes(dose)) problems.push(`dose ${dose} is not in the source`);
  }
  return problems;
}

// Every dose in a text. "Take 10mg daily." gives ["10mg"].
export function dosesIn(text: string): string[] {
  const found: string[] = [];
  for (const word of text.split(" ")) {
    const clean = word.replaceAll(".", "").replaceAll(",", "");
    if (clean.endsWith("mg")) found.push(clean);
  }
  return found;
}

if (import.meta.main) {
  const { lab } = await import("../show/18-reflect-and-fix");
  runLab(lab);
}
