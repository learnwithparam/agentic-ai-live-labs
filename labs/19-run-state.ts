// Run state
//
// The Talent Scout bot screens 120 applicants overnight. It scores each CV, one by one.
// Halfway through, the program is restarted. If the bot kept its progress in memory, it is gone.
// The bot would start again from applicant one. So the bot keeps a run record on disk.
// The record holds one entry for each applicant. It is saved after every try.
// A restart reads the record and leaves the done applicants alone. Then it goes on.
// If one applicant fails twice, the bot stops. It asks a person, because a third try would not help.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/19-run-state.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab run-state --question "Screen the first 30 applicants." --naive --crash 12
//   bun run lab run-state --question "Screen the first 30 applicants, and stop at 12." --crash 12
//   bun run lab run-state --question "Screen all 120 applicants tonight." --from 1 --count 120
//   bun run lab run-state --question "Screen the applicants from 71 on." --from 71 --count 10
//   bun run lab run-state --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { loadRun, saveRun } from "../src/runs"; // saving and reading the record
import { closeRun, countDone, entryFor, isDone, openRun, screenOne, type Scored } from "../src/screening";
import type { Applicant } from "../src/team";

export type Entry = { status: string; tries: number; score: number; note: string };
export type Run = {
  id: string;
  task: string;
  status: string; // running, done or needs-person
  startedAt: number;
  updatedAt: number;
  total: number;
  reason: string;
  results: Record<string, Entry>;
};
export type Screened = { run: Run; calls: number; log: string[] };

export const STALL_SECONDS = 120;
export const MOST_FAILS = 2;

// Screen the applicants and keep a record. Pass a run id to pick up where it stopped.
export function screenRun(
  task: string,
  list: Applicant[],
  callLlm: CallLlm,
  runId = "",
  crashAfter = 0,
): Screened {
  // Step 1: load the saved record, or open a new one before any work starts.
  const run = loadRun(runId) || openRun(task, list.length);
  const log = [`Step 1: run ${run.id} starts with ${countDone(run)} of ${list.length} done.`];
  let calls = 0;
  let screened = 0;
  for (const applicant of list) {
    // Step 2: a done applicant is not screened again. This is how a restart goes on.
    if (isDone(run, applicant.id)) continue;
    if (crashAfter > 0 && screened >= crashAfter) {
      log.push(`Step 5: the program died after ${screened} applicants.`);
      return { run, calls, log };
    }
    // Step 3: score the applicant. Save the record after every try.
    let tries = 0;
    let scored: Scored = { ok: false, score: 0, note: "" };
    while (tries < MOST_FAILS && !scored.ok) {
      tries += 1;
      calls += 1;
      scored = screenOne(applicant, tries, callLlm);
      saveEntry(run, applicant.id, entryFor(scored, tries));
    }
    // Step 4: two fails on one applicant. Stop and ask a person.
    if (!scored.ok) {
      log.push(`Step 4: ${applicant.id} failed ${tries} times. A person must look.`);
      return { run: closeRun(run, "needs-person", `${applicant.id} failed twice`), calls, log };
    }
    screened += 1;
  }
  log.push(`Step 6: ${countDone(run)} applicants are done.`);
  return { run: closeRun(run, "done", ""), calls, log };
}

// Add one result and save the record at once. A reader sees it within a moment.
export function saveEntry(run: Run, id: string, entry: Entry, now = Date.now()) {
  run.results[id] = entry;
  run.updatedAt = now;
  saveRun(run);
}

// Say what a record means right now. A run that says "running" but has gone quiet is stalled.
export function describeRun(run: Run, now = Date.now()): string {
  const quiet = Math.round((now - run.updatedAt) / 1000);
  if (run.status === "running" && quiet > STALL_SECONDS) {
    return `stalled: quiet for ${quiet} seconds`;
  }
  if (run.status === "running") return `running: ${countDone(run)} of ${run.total} done`;
  if (run.status === "needs-person") return `needs a person: ${run.reason}`;
  return `${run.status}: ${countDone(run)} of ${run.total} done`;
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
