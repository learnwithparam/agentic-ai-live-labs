// Lab 34: Memory the bots share
//
// The answer bot looks up the Cardioza dose for Dr. Lee. The outreach bot needs the same dose later.
// A shared memory saves the second search. But a bad fact in memory is copied by every bot.
// If one bot writes a wrong dose, all the others repeat it, and nobody checks again.
// So a fact is saved only after it passes the dose check. It is saved with its source and its country.
// A bot reads a fact only if it is for its own country. The approved document must still agree.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/34-shared-memory.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --model invent --naive
//   bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1
//   bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --model invent
//   bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Weber?" --hcp H-1 --then H-2
//   bun labs/34-shared-memory.ts --question "What is the dose of Zorbex for Dr. Lee?" --hcp H-1
//   bun labs/34-shared-memory.ts --demo

import { CRM, KNOWN_DRUGS } from "../src/data";
import { findProblems } from "../src/draft-check";
import { appendLine, readLines } from "../src/jobs";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop"; // lab 1

export type Fact = { drug: string; country: string; text: string; by: string };
export type Said = { answer: string; from: string; saved: boolean };
export type Seat = { file: string; bot: string }; // the shared file, and which bot is asking

// One bot answers. It looks in the shared memory first. Read the steps in order.
export function answerShared(question: string, hcpId: string, llm: CallLlm, seat: Seat): Said {
  const country = CRM[hcpId].country;
  const drug = drugIn(question);
  // Step 1: look in memory. A fact counts only for the same drug and the same country.
  const fact = findFact(seat.file, drug, country);
  // Step 2: the fact must still agree with its own approved document today. If not, ignore it.
  if (fact && findProblems(fact.text, searchApprovedDocs(drug, fact.country)).length === 0) {
    return { answer: fact.text, from: "memory", saved: false };
  }
  // Step 3: no good fact. Do the real search, as in lab 1.
  const answer = runAgentLoop(question, country, llm, undefined, 5, hcpId).answer;
  // Step 4: save the answer only if it passes the dose check. A bad answer is never shared.
  const source = searchApprovedDocs(drug, country);
  if (drug === "" || findProblems(answer, source).length > 0) {
    return { answer, from: "docs", saved: false };
  }
  appendLine(seat.file, { drug, country, text: answer, by: seat.bot });
  return { answer, from: "docs", saved: true };
}

// The naive way: save whatever a bot says, and read it back for anyone who asks about the drug.
export function answerSharedNaive(question: string, hcpId: string, llm: CallLlm, seat: Seat): Said {
  const drug = drugIn(question);
  const country = CRM[hcpId].country;
  for (const fact of readLines(seat.file)) {
    if (fact.drug === drug) return { answer: fact.text, from: "memory", saved: false };
  }
  const answer = runAgentLoop(question, country, llm, undefined, 5, hcpId).answer;
  appendLine(seat.file, { drug, country, text: answer, by: seat.bot });
  return { answer, from: "docs", saved: true };
}

function findFact(file: string, drug: string, country: string): Fact | undefined {
  for (const fact of readLines(file)) {
    if (fact.drug === drug && fact.country === country) return fact;
  }
  return undefined;
}

function drugIn(text: string): string {
  for (const drug of KNOWN_DRUGS) if (text.includes(drug)) return drug;
  return "";
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/34-shared-memory");
  runLab(lab);
}
