// What you see on screen for the run state lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/19-run-state.ts.

import { modelFrom, type Flags, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, print, red, rule, yellow } from "../src/ui";
import { addStep, describeRun, openRun, runWithoutRecord, runWithRecord } from "../labs/19-run-state";
import type { Run } from "../labs/19-run-state";
import { loadRun } from "../src/runs";

const DOSE = "What is the dose of Cardioza?";

export const lab: Lab = {
  file: "19-run-state.ts",
  title: "Run state",
  about:
    "Each example is one run of the agent. Each run saves a run record to disk. Afterwards we read the record back, the way another person or program would.",
  terms: ["run", "run-record", "stalled"],
  challenge: "A printed log is gone when the program ends. Nobody can say what the run was doing, or if it is still alive.",
  promise: "Every run has a record from its first step. The record is saved after every step. A quiet run is called stalled.",
  production: "Keep run records in a database, show them on a board, and alert on a stalled run.",
  cases: [
    { title: "NAIVE: only a printed log", why: "The agent prints what it is doing. When it ends, there is no record. Nobody can ask about it later.", question: DOSE, flags: { naive: "true" }, expect: "no-record" },
    { title: "A run that works", why: "The record is saved after each step. We read it back from disk. It says done, with its steps.", question: DOSE, expect: "done" },
    { title: "A run that fails", why: "Zorbex has no approved document. The record says failed, and why.", question: "Is Zorbex safe for children?", expect: "failed" },
    { title: "EDGE: a run that went quiet", why: "A run saved one step, then its program died. The record still says running. Ten minutes of silence means stalled.", question: DOSE, flags: { stalled: "true" }, expect: "stalled" },
    { title: "EDGE: a run that never existed", why: "Asking about an id we never saved gives a clear answer, not a crash.", question: DOSE, flags: { ask: "true", run: "R-nothing" }, expect: "unknown" },
  ],
  play(question, flags) {
    if (flags.ask) return showAsk(flags.run || "R-nothing");
    if (flags.naive) return showNaive(question, flags);
    if (flags.stalled) return showStalled(question);
    const run = runWithRecord(question, flags.country || "US", modelFrom(flags));
    return showRecord(loadRun(run.id) || run);
  },
};

function showNaive(question: string, flags: Flags): string {
  print(field("Question", question));
  runWithoutRecord(question, "US", modelFrom(flags));
  rule("AFTERWARDS");
  console.log(dim("Someone asks: what did that run do? There is no record to read."));
  box(badgeRed("NO RECORD"), [red("The log was only printed. It is gone.")], red);
  return "no-record";
}

function showRecord(run: Run): string {
  print(field("Question", run.task));
  rule("LOG, STEP BY STEP");
  for (const step of run.steps) console.log(dim(`Step ${step.n}: ${step.name} ${step.status}. ${step.note}`));
  print(field("Run id", run.id));
  print(field("Read back", describeRun(run)));
  if (run.status === "done") box(badgeGreen("DONE"), ["The record on disk says done."], yellow);
  else box(badgeYellow("FAILED"), [yellow(run.steps[run.steps.length - 1].note)], yellow);
  return run.status;
}

function showStalled(question: string): string {
  const tenMinutesAgo = Date.now() - 600_000;
  const run = openRun(question, tenMinutesAgo);
  addStep(run, "search", "done", "[DOC-101] found", tenMinutesAgo);
  rule("LOG, STEP BY STEP");
  console.log(dim("Step 1: saved a record with status running."));
  console.log(dim("Step 2: saved one step. Then the program died, ten minutes ago."));
  print(field("Read back", describeRun(run)));
  box(badgeYellow("STALLED"), [yellow("Still says running, but nothing has changed for ten minutes.")], yellow);
  return "stalled";
}

function showAsk(id: string): string {
  const run = loadRun(id);
  print(field("Asked about", id));
  const line = run === null ? `No run named ${id}.` : "Found it.";
  box(badgeYellow("UNKNOWN"), [yellow(line)], yellow);
  return run === null ? "unknown" : "found";
}
