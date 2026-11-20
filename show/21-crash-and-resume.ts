// What you see on screen for the crash and resume lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/21-crash-and-resume.ts.
// Each run is a real child program. A kill is a real SIGKILL, so nothing in it gets to clean up.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Flags, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { LEAD_IDS, runJob, runJobNaive } from "../labs/21-crash-and-resume";
import { LEADS } from "../src/team";
import { isDone, outboxOf } from "../src/jobs";

const ASK = "Send a follow-up to the 40 quiet leads";
const KILLED = LEADS[16].id; // the 17th lead
const FILE = "show/21-crash-and-resume.ts";

// What each scenario does: the runs, in order. A run is "mode:die-point". The die point may be empty.
const SCENARIOS: Record<string, string[]> = {
  naive: [`naive:send:${KILLED}`, "naive:"],
  clean: ["safe:"],
  resume: [`safe:ledger:${KILLED}`, "safe:"],
  between: [`safe:send:${KILLED}`, "safe:"],
  done: ["safe:", "safe:"],
};

export const lab: Lab = {
  file: "21-crash-and-resume.ts",
  title: "Crash and resume",
  about:
    "Each example sends a follow-up to 40 quiet leads. Some send a SIGKILL at lead 17, which stops the program at once. Pick one with --scenario: naive, clean, resume, between or done. Each finished step is written in the ledger.",
  terms: ["ledger", "idempotency-key", "resume", "sigkill"],
  challenge: "A kill in the middle of a job loses work or does it twice. Start again from the top, and the first 17 leads get the same email twice.",
  promise: "After a kill and a restart, every lead has exactly one email. A step in the ledger is never done again. An idempotency key stops a send from happening twice.",
  production: "A real agent saves its progress after every step, in a database. Then any worker can pick the job up again. Ask your email service to honour the idempotency key. Then a crash between our two writes is still safe.",
  cases: [
    { title: "NAIVE: start over after a kill", why: "The program dies after it emails lead 17. The restart begins at the top. The first 17 leads get a second email.", question: ASK, flags: { scenario: "naive" }, expect: "duplicates" },
    { title: "No crash", why: "All 40 leads get one email, and the ledger lists all 40.", question: ASK, flags: { scenario: "clean" }, expect: "ok" },
    { title: "A kill, then a restart", why: "The program dies after the ledger holds lead 17. The restart skips 17 leads and emails the other 23.", question: ASK, flags: { scenario: "resume" }, expect: "ok" },
    { title: "EDGE: a kill between the send and the ledger", why: "The email went out but the ledger line was not written. The restart tries lead 17 again, and the outbox refuses the key.", question: ASK, flags: { scenario: "between" }, expect: "ok" },
    { title: "EDGE: run a finished job again", why: "Every lead is in the ledger. The second run does nothing at all.", question: ASK, flags: { scenario: "done" }, expect: "ok" },
  ],
  play(question, flags) {
    print(field("Question", question));
    const scenario = flags.scenario || "resume";
    const jobId = `job-${Date.now()}`;
    process.env.JOBS_DIR = mkdtempSync(`${tmpdir()}/lab21-`);
    rule("LOG, STEP BY STEP");
    SCENARIOS[scenario].forEach((run, index) => startRun(index + 1, jobId, run, flags));
    return judge(jobId);
  },
};

// Start one real child program, wait for it, and say how it ended.
function startRun(number: number, jobId: string, run: string, flags: Flags): void {
  const [mode, ...rest] = run.split(":");
  const dieAt = rest.join(":");
  const args = ["bun", FILE, "worker", jobId, mode, dieAt];
  if (flags.live) args.push(flags.live);
  const done = Bun.spawnSync(args, { stdout: "pipe", stderr: "pipe", env: process.env });
  process.stderr.write(done.stderr.toString()); // the child's model calls are counted by verify
  console.log(dim(`Run ${number}: ${mode}${dieAt ? `, kill planned at ${dieAt}` : ""}`));
  const lines = done.stdout.toString().split("\n").filter((line) => line.trim() !== "");
  const shown = lines.length > 8 ? [...lines.slice(0, 3), `... ${lines.length - 5} more lines ...`, ...lines.slice(-2)] : lines;
  for (const line of shown) console.log(dim(`  ${line}`));
  if (done.exitCode !== 0) console.log(red(`  The program was killed (exit ${done.exitCode}).`));
  const ledger = LEAD_IDS.filter((id) => isDone(jobId, `${jobId}:${id}`));
  console.log(dim(`  After this run: ${outboxOf(jobId).length} emails sent, ${ledger.length} in the ledger.`));
}

// Count the emails each lead got. Exactly one each is the promise.
function judge(jobId: string): string {
  const outbox = outboxOf(jobId);
  let once = 0;
  let twice = 0;
  let none = 0;
  let outcome = "ok";
  for (const id of LEAD_IDS) {
    let count = 0;
    for (const mail of outbox) if (mail.to === id) count += 1;
    if (count === 1) once += 1;
    if (count > 1) twice += 1;
    if (count === 0) none += 1;
    if (count > 1) outcome = "duplicates";
    if (count === 0 && outcome === "ok") outcome = "missing";
  }
  console.log();
  print(field("Emails", `${once} leads got one   ${twice} got two or more   ${none} got none`));
  if (outcome === "ok") box(badgeGreen("EXACTLY ONCE"), [green("Every lead has one email.")], green);
  else if (outcome === "duplicates") box(badgeRed("DUPLICATES"), [red("A lead got the same email twice.")], red);
  else box(badgeRed("MISSING"), [red("A lead got nothing.")], red);
  return outcome;
}

// The child program. It runs the job, and the kill point may end it before it returns.
if (import.meta.main && process.argv[2] === "worker") {
  const [, , , jobId, mode, dieAt, live] = process.argv;
  const callLlm = modelFrom(live ? { live } : {});
  const job = mode === "naive" ? runJobNaive(jobId, LEAD_IDS, callLlm, dieAt) : runJob(jobId, LEAD_IDS, callLlm, dieAt);
  for (const line of job.log) console.log(line);
}
