// Run state
//
// Dr. Lee asks for the Cardioza dose. The agent works for a while. Then someone asks:
// "What is run R-7 doing?" With only a printed log, nobody can say. The log is gone.
// So the agent keeps a run record: an id, a status and a list of steps.
// It saves the record after every step. Anyone can read it, even if the agent dies.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/19-run-state.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab run-state --question "What is the dose of Cardioza?" --naive
//   bun run lab run-state --question "What is the dose of Cardioza?"
//   bun run lab run-state --question "Is Zorbex safe for children?"
//   bun run lab run-state --question "What is the dose of Cardioza?" --stalled true
//   bun run lab run-state --question "What is the dose of Cardioza?" --ask true --run R-nothing
//   bun run lab run-state --demo

import { NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { loadRun, saveRun } from "../src/runs"; // saving and reading the record
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop";

export type RunStep = { n: number; name: string; status: string; note: string; at: number };
export type Run = {
  id: string;
  task: string;
  status: string; // running, done or failed
  startedAt: number;
  updatedAt: number;
  steps: RunStep[];
};

export const STALL_SECONDS = 120;

// Answer a question and keep a record of the run. Read the steps in order.
export function runWithRecord(question: string, country: string, callLlm: CallLlm): Run {
  // Step 1: open the record before any work starts. From now on, anyone can ask.
  const run = openRun(question);

  // Step 2: search the approved documents. Save the step as soon as it ends.
  const source = searchApprovedDocs(question, country);
  addStep(run, "search", "done", source.split("\n")[0]);

  // Step 3: with no document, close the record as failed. Say why.
  if (source === NO_DOC) return closeRun(run, "failed", "no approved document");

  // Step 4: the model answers. Save the step, then close the record as done.
  const answer = runAgentLoop(question, country, callLlm).answer;
  addStep(run, "answer", "done", answer);
  return closeRun(run, "done", "");
}

// A new record has an id, a status and no steps yet.
export function openRun(task: string, now = Date.now()): Run {
  const id = "R-" + crypto.randomUUID().slice(0, 6);
  const run: Run = { id, task, status: "running", startedAt: now, updatedAt: now, steps: [] };
  saveRun(run);
  return run;
}

// Add one step and save the record at once. A reader sees it within a moment.
export function addStep(run: Run, name: string, status: string, note: string, now = Date.now()) {
  run.steps.push({ n: run.steps.length + 1, name, status, note, at: now });
  run.updatedAt = now;
  saveRun(run);
}

// Close the record. A failed run keeps its reason, so nobody has to guess.
export function closeRun(run: Run, status: string, reason: string, now = Date.now()): Run {
  run.status = status;
  run.updatedAt = now;
  if (reason) addStep(run, "stop", status, reason, now);
  saveRun(run);
  return run;
}

// Say what a record means right now. A run that says "running" but has gone quiet is stalled.
export function describeRun(run: Run, now = Date.now()): string {
  const quiet = Math.round((now - run.updatedAt) / 1000);
  if (run.status === "running" && quiet > STALL_SECONDS) {
    return `stalled: quiet for ${quiet} seconds`;
  }
  if (run.status === "running") return `running: ${run.steps.length} steps so far`;
  return `${run.status}: ${run.steps.length} steps`;
}

// The naive way: the steps are only printed. When the program ends, nothing is left to read.
export function runWithoutRecord(question: string, country: string, callLlm: CallLlm): string {
  console.log("searching...");
  const answer = runAgentLoop(question, country, callLlm).answer;
  console.log("answering...");
  return answer;
}

// Read a record back from disk, as another process would.
export function whatIsItDoing(id: string): string {
  const run = loadRun(id);
  if (run === null) return `no run named ${id}`;
  return describeRun(run);
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/19-run-state");
  runLab(lab);
}
