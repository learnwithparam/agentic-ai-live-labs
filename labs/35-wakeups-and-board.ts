// Wake the bot and show its work
//
// The Inbox Manager sweeps the mail at 9am every weekday. The Bug Triage bot wakes when GitHub posts an issue.
// Nobody asks the bot each time, so nobody sees what it did. A tick can run twice. A webhook can arrive twice.
// So every wakeup gets a key: the job and its day, or the event id. A key runs once.
// A draft may need Maya's yes. The bot does not wait all day. It saves the draft, and stops.
// Her yes comes a day later as an event. It wakes the run again, from its own log.
// Every run is a card on a board. The card says running, waiting, done or failed. A crash is never silent.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/35-wakeups-and-board.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab wakeups-and-board --question "Sweep the inbox at 9am." --times 0,1 --naive
//   bun run lab wakeups-and-board --question "Sweep the inbox every weekday." --times 0,1,24
//   bun run lab wakeups-and-board --question "Triage issue-103 when GitHub posts it." --events delivery-9001,delivery-9001
//   bun run lab wakeups-and-board --question "Draft the reply to the Acme mail." --times 0 --approval true --hold true
//   bun run lab wakeups-and-board --question "Draft the reply to the Acme mail." --times 0 --approval true --approve 24
//   bun run lab wakeups-and-board --question "Sweep the inbox at 9am today." --times 0 --fail true
//   bun run lab wakeups-and-board --demo

import { appendLine, readLines } from "../src/jobs";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";

export type Card = { key: string; name: string; status: string; at: number; note: string };
export type Event = { id: string; question: string };
export type Job = { name: string; everyHours: number; question: string; approval: boolean };
export type Plan = { jobs: Job[]; events: Event[] };
type Task = { key: string; name: string; ask: string; approval: boolean };

// Wake the bot at one moment. Hour 0 is Monday 9am.
export function wake(now: number, plan: Plan, callLlm: CallLlm, file: string): Card[] {
  const written: Card[] = [];
  for (const job of plan.jobs) {
    // Step 1: a job is due once per day. The slot is the hours since the start, split by a day.
    const key = `${job.name}:${Math.floor(now / job.everyHours)}`;
    // Step 2: a key that is on the board already has run. Do not run it again.
    if (onBoard(file, key)) continue;
    const task = { key, name: job.name, ask: job.question, approval: job.approval };
    written.push(runCard(task, now, callLlm, file));
  }
  for (const event of plan.events) {
    // Step 3: an event has its own id. A second delivery of the same id is ignored.
    const key = `event:${event.id}`;
    if (onBoard(file, key)) continue;
    const task = { key, name: "issue-posted", ask: event.question, approval: false };
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
    // Step 5: do the work. A draft that needs Maya is saved on a waiting card, and the run ends.
    const reply = callLlm([{ role: "user", content: `SWEEP: ${task.ask}` }], []);
    let status = "done";
    if (task.approval) status = "waiting";
    return finish({ key, name, status, at: now, note: (reply.text || "").slice(0, 80) }, file);
  } catch (problem) {
    // Step 6: a failed run is a card too. A person can see it. We do not hide it.
    const note = String(problem).slice(0, 80);
    return finish({ key, name, status: "failed", at: now, note }, file);
  }
}

// Step 7: Maya says yes. It is an event with its own key, so a second click does nothing.
export function approve(now: number, sweepKey: string, file: string): Card | undefined {
  const key = `approve:${sweepKey}`;
  if (onBoard(file, key)) return undefined;
  // Step 8: wake the run from its log. The waiting card holds the draft, so nothing is lost.
  let waiting: Card | undefined;
  for (const card of boardOf(file)) if (card.key === sweepKey) waiting = card;
  if (waiting === undefined || waiting.status !== "waiting") return undefined;
  appendLine(file, { key, name: "approval", status: "done", at: now, note: "Maya said yes." });
  const note = `sent after Maya said yes: ${waiting.note}`;
  return finish({ key: sweepKey, name: waiting.name, status: "done", at: now, note }, file);
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
  for (const job of plan.jobs) {
    const key = `${job.name}:${Math.floor(now / job.everyHours)}`;
    const task = { key, name: job.name, ask: job.question, approval: job.approval };
    written.push(runCard(task, now, callLlm, file));
  }
  return written;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/35-wakeups-and-board");
  runLab(lab);
}
