// The files a job keeps on disk for the crash and resume lab.
// The ledger lists every step that finished. The outbox holds every email that was sent.
// A line is forced to disk before we go on. So a kill cannot lose a line we already wrote.

import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs";

export function jobsDir(): string {
  return process.env.JOBS_DIR || ".jobs";
}

export type Mail = { key: string; to: string; body: string };

function fileOf(jobId: string, name: string): string {
  mkdirSync(`${jobsDir()}/${jobId}`, { recursive: true });
  return `${jobsDir()}/${jobId}/${name}.jsonl`;
}

// Add one line to the end of a file, and make sure the disk has it.
export function appendLine(file: string, line: object): void {
  const handle = openSync(file, "a");
  writeSync(handle, JSON.stringify(line) + "\n");
  fsyncSync(handle);
  closeSync(handle);
}

export function readLines(file: string): any[] {
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, "utf8").split("\n");
  const found: any[] = [];
  for (const line of lines) {
    if (line.trim() !== "") found.push(JSON.parse(line));
  }
  return found;
}

// The ledger: has this step finished before?
export function isDone(jobId: string, key: string): boolean {
  for (const line of readLines(fileOf(jobId, "ledger"))) {
    if (line.key === key) return true;
  }
  return false;
}

export function markDone(jobId: string, key: string): void {
  appendLine(fileOf(jobId, "ledger"), { key, at: Date.now() });
}

export function outboxOf(jobId: string): Mail[] {
  return readLines(fileOf(jobId, "outbox"));
}

// Send an email once per key. A key the outbox already holds is refused, and false comes back.
export function sendOnce(jobId: string, mail: Mail): boolean {
  for (const sent of outboxOf(jobId)) {
    if (sent.key === mail.key) return false;
  }
  appendLine(fileOf(jobId, "outbox"), mail);
  return true;
}

// The naive send: no key check. Every call adds an email.
export function sendAlways(jobId: string, mail: Mail): void {
  appendLine(fileOf(jobId, "outbox"), mail);
}

// A real kill. SIGKILL cannot be caught, so nothing is cleaned up. Used to test a crash.
export function dieIf(dieAt: string, here: string): void {
  if (dieAt === here) process.kill(process.pid, "SIGKILL");
}
