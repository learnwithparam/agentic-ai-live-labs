// LAB 18: CHECK THE DRAFT, THEN FIX IT
//
// Read PART 1. A model that grades its own answer says "looks good". It has no new facts to grade with.
// So the code checks the draft against the approved document. Then the model fixes what was found.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun labs/18-reflect-and-fix.ts --question "wrong-dose" --naive
//   bun labs/18-reflect-and-fix.ts --question "good"
//   bun labs/18-reflect-and-fix.ts --question "no-citation"
//   bun labs/18-reflect-and-fix.ts --question "wrong-dose"
//   bun labs/18-reflect-and-fix.ts --demo

import { NO_DOC } from "../src/data";
import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, print, red, rule, yellow } from "../src/ui";
import { searchApprovedDocs } from "./01-agent-loop"; // the search from lab 1

// PART 1: THE CORE LOGIC

export type Reviser = { (draft: string, problems: string[], source: string): string };
export type Result = { outcome: string; rounds: number; draft: string; problems: string[] };

export const MOST_ROUNDS = 2;

// Every dose in a text, like 10mg.
export function dosesIn(text: string): string[] {
  const found: string[] = [];
  for (const word of text.split(" ")) {
    const clean = word.replaceAll(".", "").replaceAll(",", "");
    if (clean.endsWith("mg")) found.push(clean);
  }
  return found;
}

// The check is plain code with the document in hand. It does not ask the model.
export function checkDraft(draft: string, source: string): string[] {
  const problems: string[] = [];
  if (!draft.includes("[DOC-")) problems.push("no citation");
  const allowed = dosesIn(source);
  for (const dose of dosesIn(draft)) {
    if (!allowed.includes(dose)) problems.push(`dose ${dose} is not in the source`);
  }
  return problems;
}

export function reflectAndFix(first: string, source: string, revise: Reviser): Result {
  if (source === NO_DOC) return { outcome: "no-source", rounds: 0, draft: first, problems: [] };
  let draft = first;
  let problems = checkDraft(draft, source);
  if (problems.length === 0) return { outcome: "accepted", rounds: 0, draft, problems };
  for (let round = 1; round <= MOST_ROUNDS; round++) {
    draft = revise(draft, problems, source);
    problems = checkDraft(draft, source);
    if (problems.length === 0) return { outcome: "fixed", rounds: round, draft, problems };
  }
  return { outcome: "gave-up", rounds: MOST_ROUNDS, draft, problems };
}

// The NAIVE way: ask the same model if its draft is fine. It has nothing new to check with.
export function selfApprove(first: string): Result {
  return { outcome: "self-approved", rounds: 0, draft: first, problems: [] };
}

// PART 2: HOW IT IS SHOWN (you can skip this)

type Scene = { drug: string; country: string; first: string; revise: Reviser };

// A pretend model that fixes exactly what the problems list says.
const fixesWhatIsListed: Reviser = (draft, problems, source) => {
  let text = draft;
  for (const problem of problems) {
    if (problem === "no citation") text = `${text} ${source.split(" ")[0]}`;
    if (problem.startsWith("dose ")) text = text.replaceAll(problem.split(" ")[1], dosesIn(source)[0]);
  }
  return text;
};

// A pretend model that ignores the problems and sends the same draft again.
const stubborn: Reviser = (draft) => draft;

const GOOD = "Take 10mg once daily with food. [DOC-101]";

export const SCENES: Record<string, Scene> = {
  good: { drug: "Cardioza", country: "US", first: GOOD, revise: fixesWhatIsListed },
  "no-citation": { drug: "Cardioza", country: "US", first: "Take 10mg once daily with food.", revise: fixesWhatIsListed },
  "wrong-dose": { drug: "Cardioza", country: "US", first: "Take 20mg once daily with food. [DOC-101]", revise: fixesWhatIsListed },
  "two-problems": { drug: "Cardioza", country: "US", first: "Take 20mg once daily.", revise: fixesWhatIsListed },
  stubborn: { drug: "Cardioza", country: "US", first: "Take 20mg once daily.", revise: stubborn },
  "no-source": { drug: "Dermalin", country: "DE", first: "Apply the cream twice daily.", revise: fixesWhatIsListed },
};

export const lab: Lab = {
  file: "18-reflect-and-fix.ts",
  title: "Lab 18: check the draft, then fix it",
  about:
    "Each example is a first draft written by a pretend model. Pick one by name: good, no-citation, wrong-dose, two-problems, stubborn or no-source. The code checks the draft against the approved document.",
  terms: "draft = the first answer. check = code that compares the draft with the document. round = one fix and one more check.",
  challenge: "A model that grades its own work has no new facts. It says the draft looks good, even when the dose is wrong.",
  promise: "Code checks every draft against the source. A fix gets two rounds at most. With no source there is nothing to check.",
  production: "Check what code can check, like numbers and citations. Send the rest to a person, and keep every round in the log.",
  cases: [
    { title: "NAIVE: ask the model if it is fine", why: "The draft says 20mg. The document says 10mg. The model has no new facts, so it says the draft looks good.", question: "wrong-dose", flags: { naive: "true" }, expect: "self-approved" },
    { title: "A good draft", why: "It cites the document and the dose matches. No fix is needed.", question: "good", expect: "accepted" },
    { title: "A missing citation", why: "The check finds no citation. The model adds one, and the second check passes.", question: "no-citation", expect: "fixed" },
    { title: "A wrong dose", why: "The check finds 20mg is not in the document. The model changes it to 10mg.", question: "wrong-dose", expect: "fixed" },
    { title: "EDGE: two problems at once", why: "Both problems are listed together. One round fixes both.", question: "two-problems", expect: "fixed" },
    { title: "EDGE: a model that will not change", why: "The model sends the same draft twice. After two rounds we stop and give it to a person.", question: "stubborn", expect: "gave-up" },
    { title: "No approved document", why: "Dermalin has no German document. With nothing to check against, there is no answer to give.", question: "no-source", expect: "no-source" },
  ],
  play(name, flags) {
    const scene = SCENES[name];
    if (!scene) {
      box("ERROR", [red(`No draft "${name}". Try: ${Object.keys(SCENES).join(", ")}`)], red);
      return "error";
    }
    const source = searchApprovedDocs(scene.drug, scene.country);
    print(field("Draft", scene.first));
    print(field("Source", source.split("\n")[0]));
    const result = flags.naive ? selfApprove(scene.first) : reflectAndFix(scene.first, source, scene.revise);
    rule("THE CHECK");
    for (const problem of checkDraft(scene.first, source)) console.log(`${badgeYellow("FOUND")} ${dim(problem)}`);
    print(field("Rounds", String(result.rounds)));
    print(field("Final draft", result.draft));
    if (result.outcome === "self-approved") box(badgeRed("LOOKS GOOD"), [red("The model approved a draft with a wrong dose.")], red);
    else if (result.outcome === "gave-up") box(badgeYellow("GAVE UP"), [yellow(`Still wrong: ${result.problems.join(", ")}. A person decides.`)], yellow);
    else if (result.outcome === "no-source") box(badgeYellow("NO SOURCE"), [yellow("Nothing to check against, so nothing to say.")], yellow);
    else box(badgeGreen(result.outcome.toUpperCase()), ["The final draft passes the check."], yellow);
    return result.outcome;
  },
};

if (import.meta.main) runLab(lab);
