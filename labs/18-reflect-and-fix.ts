// Check the draft, then fix it
//
// Dr. Lee asks for the Cardioza dose. The model writes a draft. The draft might be wrong.
// So we check the draft before we show it. If it is wrong, the model gets two tries to fix it.
// The run prints each step as it happens, with the same number as the step in the code.
// The pretend model and the screen output are in show/18-reflect-and-fix.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab reflect-and-fix --question "What is the dose of Cardioza?" --model invent --naive
//   bun run lab reflect-and-fix --question "What is the dose of Cardioza?"
//   bun run lab reflect-and-fix --question "What is the dose of Cardioza?" --model nocite
//   bun run lab reflect-and-fix --question "What is the dose of Cardioza?" --model invent
//   bun run lab reflect-and-fix --question "Cardioza dose for an adult?" --form true
//   bun run lab reflect-and-fix --demo

import { NO_DOC } from "../src/data";
import { newestLabel, readForm } from "../src/form-lookup";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop";
import { findProblems } from "../src/draft-check"; // the check in Step 4
import { afterCritic } from "../src/critic"; // the second reader in Step 6

export const MOST_ROUNDS = 2;
export type Result = { outcome: string; draft: string; problems: string[]; log: string[] };

// Answer a question, but check the draft first. Read the steps in order.
export function answerWithCheck(
  question: string,
  country: string,
  callLlm: CallLlm,
): Result {
  const log: string[] = [];

  // Step 1: find the approved document. The check needs it.
  const source = searchApprovedDocs(question, country);
  log.push(`Step 1: searched the approved documents. Found ${source.split("\n")[0]}`);

  // Step 2: no document means nothing to check against. Say so. Never guess.
  if (source === NO_DOC) {
    log.push("Step 2: no approved document, so there is nothing to check against. Stop.");
    return { outcome: "no-source", draft: "", problems: [], log };
  }

  // Step 3: the model writes a first draft (the agent loop's agent loop).
  let draft = runAgentLoop(question, country, callLlm).answer;
  log.push(`Step 3: the model wrote a draft. ${draft}`);

  // Step 4: check the draft with plain code and the document. We do not ask the model.
  // The check is in src/draft-check.ts.
  let problems = findProblems(draft, source);
  log.push(`Step 4: checked the draft. Problems: ${problems.join(", ") || "none"}`);
  if (problems.length === 0) return afterCritic("accepted", draft, source, callLlm, log);

  // Step 5: tell the model what is wrong, and let it fix the draft. Then check again.
  for (let round = 1; round <= MOST_ROUNDS; round++) {
    draft = askForFix(callLlm, draft, problems, source);
    log.push(`Step 5: fix round ${round}. The model rewrote it. ${draft}`);
    problems = findProblems(draft, source);
    log.push(`Step 4 again: checked the new draft. Problems: ${problems.join(", ") || "none"}`);

    // Step 6: a clean draft is done.
    if (problems.length === 0) {
      log.push("Step 6: the code check is clean.");
      return afterCritic("fixed", draft, source, callLlm, log);
    }
  }

  // Step 7: still wrong after two rounds. Stop. A person decides.
  log.push("Step 7: still wrong after the last round. A person decides.");
  return { outcome: "gave-up", draft, problems, log };
}

// The naive way: ask the same model if its draft is fine. It has no new facts, so it says yes.
// We also run our check on the draft, only to show what the model missed.
export function answerWithoutCheck(question: string, country: string, callLlm: CallLlm): Result {
  const draft = runAgentLoop(question, country, callLlm).answer;
  const prompt = `REVIEW: ${draft} Is this draft correct?`;
  const review = callLlm([{ role: "user", content: prompt }], []);
  const missed = findProblems(draft, searchApprovedDocs(question, country));

  const log = [`The model wrote a draft. ${draft}`];
  log.push("We asked the same model: is this draft correct?");
  log.push(`The model said: ${review.text}`);
  log.push(`Our check, which the model never saw, finds: ${missed.join(", ") || "nothing"}`);
  return { outcome: "self-approved", draft, problems: missed, log };
}

// The better way for a number: the model fills a small form, and code writes the number.
// The form holds a drug and an age group. It holds no dose, so the model cannot get one wrong.
export function answerFromForm(question: string, country: string, callLlm: CallLlm): Result {
  const log: string[] = [];
  // Step 1: the model fills the form.
  const said = callLlm([{ role: "user", content: `FORM: Question: ${question}` }], []).text || "";
  const form = readForm(said);
  log.push(`Step 1: the model filled the form: drug ${form.drug}, age ${form.age}.`);
  // Step 2: code finds the newest label for this drug and country. Old versions are ignored.
  const label = newestLabel(form.drug, country);
  if (label === undefined) {
    log.push("Step 2: no label for this drug and country. A person decides.");
    return { outcome: "no-source", draft: "", problems: [], log };
  }
  log.push(`Step 2: the newest label is ${label.id} version ${label.version}.`);
  // Step 3: code writes the reply from a fixed sentence. No age means both doses.
  let dose = `Adults take ${label.adult}. Children take ${label.child}.`;
  if (form.age === "adult") dose = `Adults take ${label.adult}.`;
  if (form.age === "child") dose = `Children take ${label.child}.`;
  const draft = `${dose} [${label.id}]`;
  log.push(`Step 3: code wrote the reply. ${draft}`);
  return { outcome: "from-label", draft, problems: [], log };
}

// Ask the model to fix its draft. We send the draft, what is wrong, and the approved source.
function askForFix(callLlm: CallLlm, draft: string, problems: string[], source: string): string {
  const prompt = `FIX: ${draft}\nPROBLEMS: ${problems.join("; ")}\nSOURCE: ${source}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  return reply.text || draft;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/18-reflect-and-fix");
  runLab(lab);
}
