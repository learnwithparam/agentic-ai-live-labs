import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { outboxOf } from "../../src/jobs";
import { LEADS } from "../../src/team";

const FIRST = LEADS[0].id;
const KILLED = LEADS[16].id; // the 17th lead, where the program dies

// Each run is a real child program. A kill is a real SIGKILL.
function run(dir: string, jobId: string, mode: string, dieAt: string) {
  const args = ["bun", "show/21-crash-and-resume.ts", "worker", jobId, mode, dieAt];
  const done = Bun.spawnSync(args, { stdout: "pipe", stderr: "pipe", env: { ...process.env, JOBS_DIR: dir } });
  return { killed: done.exitCode !== 0, out: done.stdout.toString() };
}

function emailsTo(jobId: string, lead: string): number {
  return outboxOf(jobId).filter((mail) => mail.to === lead).length;
}

function everyLeadOnce(jobId: string): void {
  expect(outboxOf(jobId).length).toBe(40);
  for (const lead of LEADS) expect(emailsTo(jobId, lead.id)).toBe(1);
}

// PROMISE: after a kill and a restart, every lead has exactly one email.
// A step in the ledger is never done again. A key the outbox holds is never sent again.
test("a kill after the ledger line resumes with the leads still to do", () => {
  const dir = mkdtempSync(`${tmpdir()}/p21-`);
  process.env.JOBS_DIR = dir;
  expect(run(dir, "a", "safe", `ledger:${KILLED}`).killed).toBe(true);
  const second = run(dir, "a", "safe", "");
  expect(second.killed).toBe(false);
  expect(second.out).toContain(`${FIRST} is in the ledger, so it is skipped`);
  expect(second.out).toContain(`${KILLED} is in the ledger, so it is skipped`);
  everyLeadOnce("a");
});

test("a kill between the send and the ledger never sends twice", () => {
  const dir = mkdtempSync(`${tmpdir()}/p21-`);
  process.env.JOBS_DIR = dir;
  expect(run(dir, "b", "safe", `send:${KILLED}`).killed).toBe(true);
  const second = run(dir, "b", "safe", "");
  expect(second.out).toContain("the key was used before");
  everyLeadOnce("b");
});

test("the naive restart sends twice, and a finished job does nothing", () => {
  const dir = mkdtempSync(`${tmpdir()}/p21-`);
  process.env.JOBS_DIR = dir;
  run(dir, "c", "naive", `send:${KILLED}`);
  run(dir, "c", "naive", "");
  expect(emailsTo("c", FIRST)).toBe(2);
  run(dir, "d", "safe", "");
  const again = run(dir, "d", "safe", "");
  expect(again.out).not.toContain("sent");
  expect(outboxOf("d").length).toBe(40);
});
