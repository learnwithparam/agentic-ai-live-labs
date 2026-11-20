// What you see on screen for the run state lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/19-run-state.ts.

import { modelFrom, type Lab } from "../src/runner";
import type { CallLlm } from "../src/model";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, print, red, rule, yellow } from "../src/ui";
import { describeRun, saveEntry, screenRun } from "../labs/19-run-state";
import type { Run } from "../labs/19-run-state";
import { loadRun } from "../src/runs";
import { countDone, openRun, pickApplicants, screenOne } from "../src/screening";
import type { Applicant } from "../src/team";

const FIRST_30 = "Screen the first 30 applicants for the designer job.";

// The naive way: progress sits in a variable. A restart starts again from applicant one.
export function naiveScreen(list: Applicant[], callLlm: CallLlm, crashAfter: number): number[] {
  let calls = 0;
  for (let index = 0; index < crashAfter; index++) {
    screenOne(list[index], 1, callLlm);
    calls += 1;
  }
  const first = calls;
  for (const applicant of list) {
    screenOne(applicant, 1, callLlm);
    calls += 1;
  }
  return [first, calls - first];
}

export const lab: Lab = {
  file: "19-run-state.ts",
  title: "Run state",
  about:
    "Each example is a night of screening for the Talent Scout bot. It saves a run record to disk after every try. Afterwards we read the record back, the way a restart or a person would.",
  terms: ["run", "run-record", "stalled"],
  challenge: "Progress kept in memory is gone when the program restarts. The bot would screen every applicant again. Nobody can say what the run was doing, or if it is still alive.",
  promise: "Every run has a record from its first step. The record is saved after every try. A restart picks up where it stopped. Two fails on one applicant stop the run. A quiet run is called stalled.",
  production: "Keep run records in a database, show them on a board, and alert on a stalled run.",
  cases: [
    { title: "NAIVE: progress in memory", why: "The program dies after twelve applicants. The restart knows nothing, so it screens those twelve again.", question: FIRST_30, flags: { naive: "true", crash: "12" }, expect: "starts-over" },
    { title: "A run that works", why: "Thirty applicants, no trouble. The record on disk says done.", question: "Score the first 30 applicants today.", flags: { from: "1", count: "30" }, expect: "done" },
    { title: "A restart in the middle", why: "The program dies after twelve applicants. The restart reads the record, skips them, and screens only the other eighteen.", question: "Screen thirty applicants, and the laptop sleeps.", flags: { from: "1", count: "30", crash: "12" }, expect: "resumed" },
    { title: "A busy service", why: "The CV service is busy for applicant 77. The bot tries again, the second try works, and the record says two tries.", question: "Screen applicants 71 to 80.", flags: { from: "71", count: "10" }, expect: "recovered" },
    { title: "Two fails on one applicant", why: "The CV file of applicant 40 is empty. Two tries fail, so a third would too. The run stops and asks a person.", question: "Screen all 120 applicants tonight.", flags: { from: "1", count: "120" }, expect: "needs-person" },
    { title: "EDGE: a run that went quiet", why: "A run saved one applicant, then its program died. The record still says running. Ten minutes of silence means stalled.", question: "Is the overnight screening still going?", flags: { stalled: "true" }, expect: "stalled" },
    { title: "EDGE: a run that never existed", why: "Asking about an id we never saved gives a clear answer, not a crash.", question: "What is run R-nothing doing?", flags: { ask: "true", run: "R-nothing" }, expect: "unknown" },
  ],
  play(question, flags) {
    if (flags.ask) return showAsk(flags.run || "R-nothing");
    if (flags.stalled) return showStalled(question);
    const list = pickApplicants(Number(flags.from || "1"), Number(flags.count || "30"));
    const crash = Number(flags.crash || "0");
    if (flags.naive) return showNaive(question, list, crash, modelFrom(flags));
    const first = screenRun(question, list, modelFrom(flags), "", crash);
    if (crash > 0) return showResume(question, list, first.run.id, modelFrom(flags));
    return showRecord(question, loadRun(first.run.id) || first.run, first.log);
  },
};

function showNaive(question: string, list: Applicant[], crash: number, callLlm: CallLlm): string {
  print(field("Task", question));
  const calls = naiveScreen(list, callLlm, crash);
  rule("AFTER THE RESTART");
  console.log(dim(`First go: ${calls[0]} applicants screened, then the program died.`));
  console.log(dim(`Restart: ${calls[1]} applicants screened. The first ${calls[0]} were done twice.`));
  box(badgeRed("STARTS OVER"), [red("Progress was only in memory. It is gone.")], red);
  return "starts-over";
}

function showResume(question: string, list: Applicant[], id: string, callLlm: CallLlm): string {
  print(field("Task", question));
  const saved = loadRun(id);
  rule("AFTER THE RESTART");
  console.log(dim(`The record on disk says: ${saved ? describeRun(saved) : "nothing"}.`));
  const second = screenRun(question, list, callLlm, id);
  for (const line of second.log) console.log(dim(line));
  print(field("Screened again", String(second.calls)));
  box(badgeGreen("RESUMED"), ["The restart screened only the applicants left."], yellow);
  return "resumed";
}

function showRecord(question: string, run: Run, log: string[]): string {
  print(field("Task", question));
  rule("LOG, STEP BY STEP");
  for (const line of log) console.log(dim(line));
  print(field("Run id", run.id));
  print(field("Read back", describeRun(run)));
  let slowest = 0;
  for (const id in run.results) if (run.results[id].tries > slowest) slowest = run.results[id].tries;
  if (run.status === "needs-person") {
    box(badgeYellow("NEEDS A PERSON"), [yellow(run.reason)], yellow);
    return "needs-person";
  }
  box(badgeGreen("DONE"), [`${countDone(run)} applicants are scored.`], yellow);
  if (slowest > 1) return "recovered";
  return run.status;
}

function showStalled(question: string): string {
  const tenMinutesAgo = Date.now() - 600_000;
  const run = openRun(question, 120, tenMinutesAgo);
  saveEntry(run, "applicant-001", { status: "done", tries: 1, score: 58, note: "scored" }, tenMinutesAgo);
  rule("LOG, STEP BY STEP");
  console.log(dim("Step 1: saved a record with status running."));
  console.log(dim("Step 2: saved one applicant. Then the program died, ten minutes ago."));
  print(field("Read back", describeRun(run)));
  box(badgeYellow("STALLED"), [yellow("Still says running, but nothing has changed for ten minutes.")], yellow);
  return "stalled";
}

function showAsk(id: string): string {
  const run = loadRun(id);
  print(field("Asked about", id));
  let line = "Found it.";
  if (run === null) line = `No run named ${id}.`;
  box(badgeYellow("UNKNOWN"), [yellow(line)], yellow);
  if (run === null) return "unknown";
  return "found";
}
