// Evals and the release gate
//
// A teammate changes the document search so it is faster. It still answers every question.
// But Dr. Weber in Germany now gets the US dose. Nobody tested it, so it shipped on Friday.
// An eval set is a list of real questions, each with the facts a right answer must have.
// Before each release we run every question, and one failure blocks the release.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/28-evals-and-release.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab evals-and-release --question "Is this new version ready to release?" --version wide --naive
//   bun run lab evals-and-release --question "Is this new version ready to release?" --version current
//   bun run lab evals-and-release --question "Is this new version ready to release?" --version wide
//   bun run lab evals-and-release --question "Is this new version ready to release?" --version invents
//   bun run lab evals-and-release --question "Is this new version ready to release?" --evals none
//   bun run lab evals-and-release --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { CRM } from "../src/data";
import { toolFor } from "../src/releases"; // the versions we test
import { runAgentLoop } from "./01-agent-loop";

export type Eval = { ask: string; hcp: string; mustHave: string[]; mustNot: string[] };
export type Result = { ask: string; hcp: string; answer: string; passed: boolean; why: string };
export type Decision = { release: boolean; failed: Result[]; reason: string };

// The eval set. Every question is one a real doctor asked, with the facts a right answer holds.
export const EVALS: Eval[] = [
  { ask: "What is the dose of Cardioza?", hcp: "dr-lee",
    mustHave: ["CARDIOZA-US"], mustNot: ["CARDIOZA-DE"] },
  { ask: "What is the dose of Cardioza?", hcp: "dr-weber",
    mustHave: ["CARDIOZA-DE"], mustNot: ["CARDIOZA-US"] },
  { ask: "What is the dose of Neurovex?", hcp: "dr-lee", mustHave: ["NEUROVEX-US"], mustNot: [] },
  { ask: "What is the dose of Zorbex?", hcp: "dr-lee", mustHave: [], mustNot: ["mg", "["] },
];

// Run every eval question through one version. Read the steps in order.
export function runEvals(version: string, evals: Eval[], callLlm: CallLlm): Result[] {
  const results: Result[] = [];
  for (const item of evals) {
    // Step 1: ask the question as the doctor would, and keep the answer.
    const country = CRM[item.hcp].country;
    const tool = toolFor(version, country);
    const answer = runAgentLoop(item.ask, country, callLlm, [tool], 5, item.hcp).answer;
    // Step 2: grade it. Every fact it must have, and none it must not.
    results.push(grade(item, answer));
  }
  return results;
}

function grade(item: Eval, answer: string): Result {
  let why = "";
  for (const word of item.mustHave) if (!answer.includes(word)) why = `it lacks ${word}`;
  for (const word of item.mustNot) if (answer.includes(word)) why = `it holds ${word}`;
  return { ask: item.ask, hcp: item.hcp, answer, passed: why === "", why };
}

// Decide whether the release may go out.
export function decide(results: Result[]): Decision {
  // Step 3: no evals means nothing was tested, so nothing ships.
  if (results.length === 0) return { release: false, failed: [], reason: "there are no evals" };
  // Step 4: one failed eval blocks the release.
  const failed: Result[] = [];
  for (const result of results) if (!result.passed) failed.push(result);
  if (failed.length > 0) return { release: false, failed, reason: `${failed.length} eval failed` };
  return { release: true, failed, reason: "every eval passed" };
}

// The naive gate: if the version answers every question, ship it.
export function shipIfItRuns(results: Result[]): Decision {
  for (const result of results) {
    if (result.answer.trim() === "") return { release: false, failed: [], reason: "no answer" };
  }
  return { release: true, failed: [], reason: "it answered every question" };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/28-evals-and-release");
  runLab(lab);
}
