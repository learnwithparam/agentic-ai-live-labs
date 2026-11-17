// Lab 35: Wake the bot and show its work
//
// A bot checks the Cardioza dose for Dr. Lee every day. A webhook also wakes it when a new label is posted.
// Nobody asks the bot each time, so nobody sees what it did. A tick can run twice. A webhook can arrive twice.
// So every wakeup gets a key: the job and its time slot, or the event id. A key runs once.
// Every run is a card on a board. The card says running, done or failed, so a crash is never silent.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/35-wakeups-and-board.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose for Dr. Lee every day." --times 0,5 --naive
//   bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose for Dr. Lee every day." --times 0,5,25
//   bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose when a new label is posted." --events label-7,label-7
//   bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose for Dr. Lee every day." --times 0 --fail true
//   bun labs/35-wakeups-and-board.ts --demo

import { CRM } from "../src/data";
import { appendLine, readLines } from "../src/jobs";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { runAgentLoop } from "./01-agent-loop"; // lab 1

export type Card = { key: string; name: string; status: string; at: number; note: string };
export type Event = { id: string; hcpId: string; question: string };
export type Job = { name: string; everyHours: number; hcpId: string; question: string };
export type Plan = { jobs: Job[]; events: Event[] };
type Task = { key: string; name: string; ask: string; hcp: string };

// Wake the bot at one moment. Read the steps in order. It returns the cards written now.
export function wake(now: number, plan: Plan, callLlm: CallLlm, file: string): Card[] {
  const written: Card[] = [];
  for (const job of plan.jobs) {
    // Step 1: a job is due once per slot. The slot is the hours since the start, split by its period.
    const key = `${job.name}:${Math.floor(now / job.everyHours)}`;
    // Step 2: a key that is on the board already has run. Do not run it again.
    if (onBoard(file, key)) continue;
    const task = { key, name: job.name, ask: job.question, hcp: job.hcpId };
    written.push(runCard(task, now, callLlm, file));
  }
  for (const event of plan.events) {
    // Step 3: an event has its own id. A second delivery of the same id is ignored.
    const key = `event:${event.id}`;
    if (onBoard(file, key)) continue;
    const task = { key, name: "label-posted", ask: event.question, hcp: event.hcpId };
    written.push(runCard(task, now, callLlm, file));
  }
  return written;
}

// Do the work, and keep the board true. A card says running before the work starts.
function runCard(task: Task, now: number, callLlm: CallLlm, file: string): Card {
  const { key, name } = task;
  // Step 4: write the card first. A crash then leaves a card that says running.
  appendLine(file, { key, name, status: "running", at: now, note: "" });
  try {
    // Step 5: do the work. This is the loop from lab 1.
    const country = CRM[task.hcp].country;
    const answer = runAgentLoop(task.ask, country, callLlm, undefined, 5, task.hcp).answer;
    return finish({ key, name, status: "done", at: now, note: answer.slice(0, 80) }, file);
  } catch (problem) {
    // Step 6: a failed run is a card too. A person can see it. We do not hide it.
    const note = String(problem).slice(0, 80);
    return finish({ key, name, status: "failed", at: now, note }, file);
  }
}

function finish(card: Card, file: string): Card {
  appendLine(file, card);
  return card;
}

function onBoard(file: string, key: string): boolean {
  for (const card of readLines(file)) if (card.key === key) return true;
  return false;
}

// The latest line for each key is the card people see.
export function boardOf(file: string): Card[] {
  const latest: Record<string, Card> = {};
  for (const card of readLines(file)) latest[card.key] = card;
  return Object.values(latest);
}

// The naive way: every wakeup runs. A repeated tick or a repeated webhook does the work again.
export function wakeNaive(now: number, plan: Plan, callLlm: CallLlm, file: string): Card[] {
  const written: Card[] = [];
  const tasks: Task[] = [];
  for (const job of plan.jobs) {
    const key = `${job.name}:${Math.floor(now / job.everyHours)}`;
    tasks.push({ key, name: job.name, ask: job.question, hcp: job.hcpId });
  }
  for (const event of plan.events) {
    const key = `event:${event.id}`;
    tasks.push({ key, name: "label-posted", ask: event.question, hcp: event.hcpId });
  }
  for (const task of tasks) written.push(runCard(task, now, callLlm, file));
  return written;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/35-wakeups-and-board");
  runLab(lab);
}
