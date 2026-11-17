// Workers side by side
//
// Dr. Lee has a call soon. The rep wants a short brief. It needs the dose, the profile and the emails.
// Three systems hold these. Each one takes a second.
// Done one by one, that is three seconds. A stuck system makes the rep wait for good.
// So the lead starts all three workers at once. Each worker is a real program.
// The lead waits only until a set time. A late worker is stopped. A worker that dies is named.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/31-parallel-workers.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab parallel-workers --question "Please prepare a call brief for Dr. Lee." --hcp H-1 --naive
//   bun run lab parallel-workers --question "Please prepare a call brief for Dr. Lee." --hcp H-1
//   bun run lab parallel-workers --question "Please prepare a call brief for Dr. Weber." --hcp H-2
//   bun run lab parallel-workers --question "Please prepare a call brief for Dr. Lee." --hcp H-1 --stuck emails
//   bun run lab parallel-workers --question "Please prepare a call brief for Dr. Lee." --hcp H-1 --crash profile
//   bun run lab parallel-workers --demo

import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { CRM, EMAILS } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { isRunning, startWorker, stopWorker } from "../src/workers"; // real child programs
import type { Child } from "../src/workers";
import { runAgentLoop } from "./01-agent-loop";

export type Part = { name: string; ok: boolean; text: string; why: string };
export type Brief = { parts: Part[]; late: string[]; seconds: number };

export const NAMES = ["docs", "profile", "emails"];
const WORKER_FILE = "show/31-parallel-workers.ts";

// The real job of each worker. It sees one doctor and nothing else.
export function doWork(name: string, hcp: string, callLlm: CallLlm): string {
  const doctor = CRM[hcp];
  if (name === "profile") return `${doctor.name}, ${doctor.specialty}, ${doctor.country}`;
  if (name === "emails") return EMAILS[hcp].join("; ") || "no emails yet";
  const ask = "What is the dose of Cardioza?";
  return runAgentLoop(ask, doctor.country, callLlm, undefined, 5, hcp).answer;
}

// Make the brief. Read the steps in order. Each mode is "ok", "stuck" or "crash".
export type Modes = Record<string, string>;
export function makeBrief(hcp: string, dir: string, modes: Modes, limitMs: number): Brief {
  mkdirSync(dir, { recursive: true });
  const started = Date.now();
  // Step 1: start every worker at once. Each one is its own program with its own result file.
  const running: Record<string, Child> = {};
  for (const name of NAMES) running[name] = start(name, hcp, dir, modes[name] || "ok");
  // Step 2: wait for all of them, but never past the deadline.
  while (Date.now() - started < limitMs && stillRunning(running) > 0) Bun.sleepSync(50);
  // Step 3: stop any worker that is late. The brief goes out without it.
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

function start(name: string, hcp: string, dir: string, mode: string): Child {
  const args = ["bun", WORKER_FILE, "worker", name, hcp, dir, mode, process.env.LIVE_FLAG || ""];
  return startWorker(args);
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
export function makeBriefSlowly(hcp: string, dir: string, limitMs: number): Brief {
  const started = Date.now();
  for (const name of NAMES) {
    const child = start(name, hcp, dir, "ok");
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
