// LAB 18: CHECK THE DRAFT, THEN FIX IT
//
// The story: Dr. Lee asks for the Cardioza dose. The model writes a draft. What if the draft is wrong?
// Read PART 1 from top to bottom. It is one function, answerWithCheck, in seven numbered steps.
// The run prints the same seven steps, so you can follow the code and the output together.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model invent --naive
//   bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?"
//   bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model nocite
//   bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model invent
//   bun labs/18-reflect-and-fix.ts --demo

import { NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { modelFrom, runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, print, red, rule, yellow } from "../src/ui";
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop"; // lab 1

// PART 1: THE CORE LOGIC

export const MOST_ROUNDS = 2;
export type FixDraft = { (draft: string, problems: string[], source: string): string }; // the model
export type Result = { outcome: string; draft: string; problems: string[]; path: string[] };

// THE WHOLE IDEA, from top to bottom.
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

// THE NAIVE WAY: ask the same model if its draft is fine. It has no new facts, so it says yes.
export function answerWithoutCheck(question: string, country: string, callLlm: CallLlm): Result {
  const draft = runAgentLoop(question, country, callLlm).answer;
  const path = [`The model wrote a draft. ${draft}`];
  path.push("We asked the same model: is this draft fine?");
  path.push("The model said: looks good. Nothing was checked.");
  return { outcome: "self-approved", draft, problems: [], path };
}

// THE CHECK. Small helpers that Step 4 uses. Skim them.

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

// PART 2: HOW IT IS SHOWN (you can skip this)

// A pretend model fixing a draft. It rewrites the answer from the document and adds the citation.
export const fixFromSource: FixDraft = (draft, problems, source) => {
  const id = source.split(" ")[0];
  const text = source.split("\n")[0].replace(`${id} `, "");
  return `${text} ${id}`;
};

// A pretend model that does not listen. It sends the same draft again.
export const ignoresProblems: FixDraft = (draft) => draft;

export const lab: Lab = {
  file: "18-reflect-and-fix.ts",
  title: "Lab 18: check the draft, then fix it",
  about:
    "Each example is a doctor's question. The pretend model writes a draft, and sometimes the draft is wrong. Pick how it behaves with --model: ok, nocite (forgets the citation) or invent (a wrong dose). Add --fixer ignores for a model that will not fix its draft.",
  terms: "draft = the first answer. check = plain code that compares the draft with the document. round = one fix and one more check.",
  challenge: "A model that grades its own work has no new facts. It says the draft looks good, even when the dose is wrong.",
  promise: "Code checks every draft against the source. A fix gets two rounds at most. With no source there is nothing to check.",
  production: "Check what code can check, like numbers and citations. Send the rest to a person, and keep every round in the log.",
  cases: [
    { title: "NAIVE: ask the model if it is fine", why: "The model writes 20mg. The document says 10mg. We ask the model if the draft is fine. It has no new facts, so it says yes.", question: "What is the dose of Cardioza?", flags: { model: "invent", naive: "true" }, expect: "self-approved" },
    { title: "A good draft", why: "It cites the document and the dose matches. No fix is needed.", question: "What is the dose of Cardioza?", expect: "accepted" },
    { title: "A missing citation", why: "The check finds no citation. The model adds one, and the second check passes.", question: "What is the dose of Cardioza?", flags: { model: "nocite" }, expect: "fixed" },
    { title: "A wrong dose", why: "The check finds 20mg is not in the document. The model changes it to 10mg.", question: "What is the dose of Cardioza?", flags: { model: "invent" }, expect: "fixed" },
    { title: "EDGE: a model that will not change", why: "The model sends the same wrong draft twice. After two rounds we stop and give it to a person.", question: "What is the dose of Cardioza?", flags: { model: "invent", fixer: "ignores" }, expect: "gave-up" },
    { title: "No approved document", why: "Zorbex has no approved document. With nothing to check against, there is no answer to give.", question: "Is Zorbex safe for children?", expect: "no-source" },
  ],
  play(question, flags) {
    const country = flags.country || "US";
    const callLlm = modelFrom(flags);
    const fixDraft = flags.fixer === "ignores" ? ignoresProblems : fixFromSource;
    print(field("Question", question));
    const result = flags.naive ? answerWithoutCheck(question, country, callLlm) : answerWithCheck(question, country, callLlm, fixDraft);
    rule("WHAT HAPPENED, STEP BY STEP");
    for (const line of result.path) console.log(dim(line));
    if (result.outcome === "self-approved") box(badgeRed("LOOKS GOOD"), [red("The model approved a draft with a wrong dose.")], red);
    else if (result.outcome === "gave-up") box(badgeYellow("GAVE UP"), [yellow(`Still wrong: ${result.problems.join(", ")}. A person decides.`)], yellow);
    else if (result.outcome === "no-source") box(badgeYellow("NO SOURCE"), [yellow("Nothing to check against, so nothing to say.")], yellow);
    else box(badgeGreen(result.outcome.toUpperCase()), [result.draft], yellow);
    return result.outcome;
  },
};

if (import.meta.main) runLab(lab);
