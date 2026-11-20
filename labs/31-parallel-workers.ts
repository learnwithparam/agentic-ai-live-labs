// Workers side by side
//
// Juniper Studio has a pitch on Friday. A prospect wants a new brand. The team needs a short
// note on the prospect's rival: its site, its social posts, its prices and who it sells to.
// Four sources hold these. Each one takes a second.
// Done one by one, that is four seconds. A stuck source makes the team wait for good.
// So the lead starts all four workers at once. Each worker is a real program.
// The lead waits only until a set time. A late worker is stopped. A worker that dies is named.
// Then one writer merges what came back into one note.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/31-parallel-workers.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab parallel-workers --question "Research the rival of the bakery." --prospect prospect-bakery --naive
//   bun run lab parallel-workers --question "Research the rival of the bakery." --prospect prospect-bakery
//   bun run lab parallel-workers --question "Research the rival of the gym." --prospect prospect-gym
//   bun run lab parallel-workers --question "Research the rival of the bakery." --prospect prospect-bakery --stuck social
//   bun run lab parallel-workers --question "Research the rival of the bakery." --prospect prospect-bakery --crash pricing
//   bun run lab parallel-workers --demo

import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { PITCH_SOURCES, PROSPECTS } from "../src/juniper";
import { runLab } from "../src/runner";
import { isRunning, startWorker, stopWorker } from "../src/workers"; // real child programs
import type { Child } from "../src/workers";

export type Part = { name: string; ok: boolean; text: string; why: string };
export type Brief = { parts: Part[]; late: string[]; seconds: number };

export const NAMES = PITCH_SOURCES;
const WORKER_FILE = "show/31-parallel-workers.ts";

// The real job of each worker. It reads one source for one prospect and nothing else.
export function doWork(name: string, prospect: string): string {
  const known = PROSPECTS[prospect];
  if (known === undefined) return "no such prospect";
  return known[name] || "nothing found";
}

// Make the brief. Read the steps in order. Each mode is "ok", "stuck" or "crash".
export type Modes = Record<string, string>;
export function makeBrief(prospect: string, dir: string, modes: Modes, limitMs: number): Brief {
  mkdirSync(dir, { recursive: true });
  const started = Date.now();
  // Step 1: start every worker at once. Each one is its own program with its own result file.
  const running: Record<string, Child> = {};
  for (const name of NAMES) running[name] = start(name, prospect, dir, modes[name] || "ok");
  // Step 2: wait for all of them, but never past the deadline.
  while (Date.now() - started < limitMs && stillRunning(running) > 0) Bun.sleepSync(50);
  // Step 3: stop any worker that is late. The note goes out without it.
  const late: string[] = [];
  for (const name of NAMES) {
    if (isRunning(running[name])) {
      stopWorker(running[name]);
      late.push(name);
    }
  }
  // Step 4: read each result file. Every worker wrote its own, so none can overwrite another.
  const parts: Part[] = [];
  for (const name of NAMES) parts.push(readPart(name, dir, late.includes(name)));
  return { parts, late, seconds: (Date.now() - started) / 1000 };
}

// Step 5: one writer merges the parts into one note. A missing part is named in the note.
export function writeNote(brief: Brief): string {
  const lines: string[] = [];
  for (const part of brief.parts) {
    if (part.ok) lines.push(`${part.name}: ${part.text}`);
    else lines.push(`${part.name}: missing, ${part.why}`);
  }
  return lines.join("\n");
}

function start(name: string, prospect: string, dir: string, mode: string): Child {
  return startWorker(["bun", WORKER_FILE, "worker", name, prospect, dir, mode]);
}

function stillRunning(running: Record<string, Child>): number {
  let count = 0;
  for (const name of NAMES) if (isRunning(running[name])) count += 1;
  return count;
}

function readPart(name: string, dir: string, wasLate: boolean): Part {
  const file = `${dir}/${name}.txt`;
  if (existsSync(file)) return { name, ok: true, text: readFileSync(file, "utf8"), why: "" };
  if (wasLate) return { name, ok: false, text: "", why: "too slow, stopped at the deadline" };
  return { name, ok: false, text: "", why: "the worker stopped without a result" };
}

// The naive way: one worker at a time, and no deadline.
export function makeBriefSlowly(prospect: string, dir: string, limitMs: number): Brief {
  const started = Date.now();
  for (const name of NAMES) {
    const child = start(name, prospect, dir, "ok");
    while (isRunning(child) && Date.now() - started < limitMs) Bun.sleepSync(50);
  }
  const parts: Part[] = [];
  for (const name of NAMES) parts.push(readPart(name, dir, false));
  return { parts, late: [], seconds: (Date.now() - started) / 1000 };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/31-parallel-workers");
  runLab(lab);
}
