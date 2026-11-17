// What you see on screen for the crash and resume lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/21-crash-and-resume.ts.
// Each run is a real child program. A kill is a real SIGKILL, so nothing in it gets to clean up.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Flags, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { DOCTORS, runJob, runJobNaive } from "../labs/21-crash-and-resume";
import { isDone, outboxOf } from "../src/jobs";

const ASK = "Email the Cardioza update to three doctors";
const FILE = "show/21-crash-and-resume.ts";
const NAMES: Record<string, string> = { "H-1": "Dr. Lee", "H-2": "Dr. Weber", "H-3": "Dr. Rao" };

// What each scenario does: the runs, in order. A run is "mode:die-point". The die point may be empty.
const SCENARIOS: Record<string, string[]> = {
  naive: ["naive:send:H-2", "naive:"],
  clean: ["safe:"],
  resume: ["safe:ledger:H-2", "safe:"],
  between: ["safe:send:H-2", "safe:"],
  done: ["safe:", "safe:"],
};

export const lab: Lab = {
  file: "21-crash-and-resume.ts",
  title: "Crash and resume",
  about:
    "Each example emails three doctors. Some examples send a SIGKILL, which stops the program at once, and then start it again. Pick one with --scenario: naive, clean, resume, between or done. Each finished step is written in the ledger.",
  terms: ["ledger", "idempotency-key", "resume", "sigkill"],
  challenge: "A kill in the middle of a job loses work or does it twice. Start again from the top, and the first doctors get the same email twice.",
  promise: "After a kill and a restart, every doctor has exactly one email. A step in the ledger is never done again. An idempotency key stops a send from happening twice.",
  production: "Keep the ledger in a database. Ask your email service to honour the idempotency key. Then a crash between our two writes is still safe.",
  cases: [
    { title: "NAIVE: start over after a kill", why: "The program dies after it emails Dr. Weber. The restart begins at the top. Dr. Lee and Dr. Weber get a second email.", question: ASK, flags: { scenario: "naive" }, expect: "duplicates" },
    { title: "No crash", why: "All three doctors get one email, and the ledger lists all three.", question: ASK, flags: { scenario: "clean" }, expect: "ok" },
    { title: "A kill, then a restart", why: "The program dies after the ledger holds Dr. Weber. The restart skips two doctors and emails Dr. Rao.", question: ASK, flags: { scenario: "resume" }, expect: "ok" },
    { title: "EDGE: a kill between the send and the ledger", why: "The email went out but the ledger line was not written. The restart tries Dr. Weber again, and the outbox refuses the key.", question: ASK, flags: { scenario: "between" }, expect: "ok" },
    { title: "EDGE: run a finished job again", why: "Every doctor is in the ledger. The second run does nothing at all.", question: ASK, flags: { scenario: "done" }, expect: "ok" },
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
  for (const line of done.stdout.toString().split("\n")) {
    if (line.trim() !== "") console.log(dim(`  ${line}`));
  }
  if (done.exitCode !== 0) console.log(red(`  The program was killed (exit ${done.exitCode}).`));
  const ledger = DOCTORS.filter((id) => isDone(jobId, `${jobId}:${id}`));
  console.log(dim(`  After this run: ${outboxOf(jobId).length} emails sent, ${ledger.length} in the ledger.`));
}

// Count the emails each doctor got. Exactly one each is the promise.
function judge(jobId: string): string {
  const outbox = outboxOf(jobId);
  const counts: string[] = [];
  let outcome = "ok";
  for (const id of DOCTORS) {
    let count = 0;
    for (const mail of outbox) if (mail.to === id) count += 1;
    counts.push(`${NAMES[id]}: ${count}`);
    if (count > 1) outcome = "duplicates";
    if (count === 0 && outcome === "ok") outcome = "missing";
  }
  console.log();
  print(field("Emails", counts.join("   ")));
  if (outcome === "ok") box(badgeGreen("EXACTLY ONCE"), [green("Every doctor has one email.")], green);
  else if (outcome === "duplicates") box(badgeRed("DUPLICATES"), [red("A doctor got the same email twice.")], red);
  else box(badgeRed("MISSING"), [red("A doctor got nothing.")], red);
  return outcome;
}

// The child program. It runs the job, and the kill point may end it before it returns.
if (import.meta.main && process.argv[2] === "worker") {
  const [, , , jobId, mode, dieAt, live] = process.argv;
  const callLlm = modelFrom(live ? { live } : {});
  const job = mode === "naive" ? runJobNaive(jobId, DOCTORS, callLlm, dieAt) : runJob(jobId, DOCTORS, callLlm, dieAt);
  for (const line of job.log) console.log(line);
}
