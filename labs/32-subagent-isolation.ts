// Lab 32: Keep noisy work apart
//
// Dr. Lee asks for the Cardioza dose. The document search returns the real answer.
// It also returns forty old drafts, and they hold wrong doses.
// If the main agent reads all of that, its working space fills with junk. It may copy a wrong dose.
// So the main agent hands the search to a helper. The helper has its own space.
// The helper sends back one short report. The junk stays with the helper.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/32-subagent-isolation.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/32-subagent-isolation.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --naive
//   bun labs/32-subagent-isolation.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1
//   bun labs/32-subagent-isolation.ts --question "What is the dose of Cardioza for Dr. Weber?" --hcp H-2
//   bun labs/32-subagent-isolation.ts --question "What is the dose of Zorbex for Dr. Lee?" --hcp H-1
//   bun labs/32-subagent-isolation.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --model invent
//   bun labs/32-subagent-isolation.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --model stuck
//   bun labs/32-subagent-isolation.ts --demo

import { CRM } from "../src/data";
import { searchWithArchive } from "../src/archive";
import { findProblems } from "../src/draft-check";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop"; // lab 1
import type { LoopResult, Tool } from "./01-agent-loop";

export const REPORT_LIMIT = 400;
export type Answered = { answer: string; mainChars: number; helperChars: number; log: string[] };
const noisySearch: Tool[] = [{ name: "search_approved_docs", run: searchWithArchive }];

// The main agent. Read the steps in order.
export function answerWithHelper(question: string, hcpId: string, callLlm: CallLlm): Answered {
  const country = CRM[hcpId].country;
  // Step 1: the main agent starts its own space. It holds only the question.
  const main: string[] = [question];
  // Step 2: the helper does the noisy search in its own space.
  const work = runAgentLoop(question, country, callLlm, noisySearch, 5, hcpId);
  // Step 3: only a short report comes back. A long report is cut. A failed helper says so.
  let report = "HELPER_FAILED: no answer.";
  if (!work.stopped) report = work.answer.slice(0, REPORT_LIMIT);
  main.push(report);
  // Step 4: the main agent checks the report against the approved source, then answers.
  const answer = checkedAnswer(report, question, country);
  const log = [`Step 2: the helper read ${sizeOf(work)} characters.`];
  log.push(`Step 3: the main agent kept ${report.length} characters.`);
  return { answer, mainChars: total(main), helperChars: sizeOf(work), log };
}

// The naive way: the main agent searches itself, so every old draft lands in its own space.
export function answerAlone(question: string, hcpId: string, callLlm: CallLlm): Answered {
  const country = CRM[hcpId].country;
  const work = runAgentLoop(question, country, callLlm, noisySearch, 5, hcpId);
  const log = [`The main agent read ${sizeOf(work)} characters itself.`];
  return { answer: work.answer, mainChars: question.length + sizeOf(work), helperChars: 0, log };
}

function checkedAnswer(report: string, question: string, country: string): string {
  const source = searchApprovedDocs(question, country);
  if (findProblems(report, source).length > 0) return "I found no approved answer for this.";
  return report;
}

function sizeOf(work: LoopResult): number {
  let size = 0;
  for (const step of work.steps) size += step.result.length;
  return size;
}

function total(parts: string[]): number {
  let size = 0;
  for (const part of parts) size += part.length;
  return size;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/32-subagent-isolation");
  runLab(lab);
}
