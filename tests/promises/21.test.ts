import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { outboxOf } from "../../src/jobs";

// Each run is a real child program. A kill is a real SIGKILL.
function run(dir: string, jobId: string, mode: string, dieAt: string) {
  const args = ["bun", "show/21-crash-and-resume.ts", "worker", jobId, mode, dieAt];
  const done = Bun.spawnSync(args, { stdout: "pipe", stderr: "pipe", env: { ...process.env, JOBS_DIR: dir } });
  return { killed: done.exitCode !== 0, out: done.stdout.toString() };
}

function emailsTo(jobId: string, doctor: string): number {
  return outboxOf(jobId).filter((mail) => mail.to === doctor).length;
}

// PROMISE: after a kill and a restart, every doctor has exactly one email.
// A step in the ledger is never done again. A key the outbox holds is never sent again.
test("lab 21: a kill after the ledger line resumes with the doctors still to do", () => {
  const dir = mkdtempSync(`${tmpdir()}/p21-`);
  process.env.JOBS_DIR = dir;
  expect(run(dir, "a", "safe", "ledger:H-2").killed).toBe(true);
  const second = run(dir, "a", "safe", "");
  expect(second.killed).toBe(false);
  expect(second.out).toContain("H-1 is in the ledger, so it is skipped");
  expect(second.out).toContain("H-2 is in the ledger, so it is skipped");
  for (const doctor of ["H-1", "H-2", "H-3"]) expect(emailsTo("a", doctor)).toBe(1);
});

test("lab 21: a kill between the send and the ledger never sends twice", () => {
  const dir = mkdtempSync(`${tmpdir()}/p21-`);
  process.env.JOBS_DIR = dir;
  expect(run(dir, "b", "safe", "send:H-2").killed).toBe(true);
  const second = run(dir, "b", "safe", "");
  expect(second.out).toContain("the key was used before");
  for (const doctor of ["H-1", "H-2", "H-3"]) expect(emailsTo("b", doctor)).toBe(1);
});

test("lab 21: the naive restart sends twice, and a finished job does nothing", () => {
  const dir = mkdtempSync(`${tmpdir()}/p21-`);
  process.env.JOBS_DIR = dir;
  run(dir, "c", "naive", "send:H-2");
  run(dir, "c", "naive", "");
  expect(emailsTo("c", "H-1")).toBe(2);
  run(dir, "d", "safe", "");
  const again = run(dir, "d", "safe", "");
  expect(again.out).not.toContain("sent");
  expect(outboxOf("d").length).toBe(3);
});
