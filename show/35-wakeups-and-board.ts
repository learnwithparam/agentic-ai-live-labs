// What you see on screen for the wakeups and board lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/35-wakeups-and-board.ts.
// Time is a number of hours. Hour 0 is Monday 9am. Hour 24 is Tuesday 9am.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { appendLine, readLines } from "../src/jobs";
import type { CallLlm } from "../src/model";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { approve, boardOf, wake, wakeNaive, type Card, type Plan } from "../labs/35-wakeups-and-board";

const SWEEP = "Sweep the inbox every weekday at 9am.";
const ISSUE = "Triage issue-103 when GitHub posts it.";
const DRAFT = "Draft the reply to the Acme contract mail.";

function broken(): CallLlm {
  return () => {
    throw new Error("the model is down");
  };
}

// The other naive way: the worker waits for Maya inside the run. Its card says running all day.
function wakeAndWait(now: number, plan: Plan, file: string): Card[] {
  const written: Card[] = [];
  for (const job of plan.jobs) {
    const key = `${job.name}:${Math.floor(now / job.everyHours)}`;
    const card = { key, name: job.name, status: "running", at: now, note: "waiting for Maya" };
    appendLine(file, card);
    written.push(card);
  }
  return written;
}

export const lab: Lab = {
  file: "35-wakeups-and-board.ts",
  title: "Wake the bot and show its work",
  about:
    "Each example wakes a bot. Give the hours of each wakeup with --times, where hour 0 is Monday 9am. Give webhook ids with --events, and send the same id twice to see a repeat. Add --approval true for a draft that needs Maya, and --approve with the hour of her yes. Add --fail true to make the model fail.",
  terms: ["wakeup", "slot", "board", "idempotent"],
  challenge: "A bot that wakes by itself can run twice, and nobody sees it. A tick repeats, or a webhook arrives twice, and the work is done again. A bot that waits for Maya all day is stuck.",
  promise: "A key runs once, so the job is idempotent. A draft waits as a card, not as a worker. Maya's yes wakes it from its log. A failed run is a card that says failed.",
  production: "Use your scheduler or a queue, and keep the keys in a database. Alert Maya when a card says failed, or waits too long.",
  cases: [
    { title: "NAIVE: every wakeup runs", why: "The bot wakes at 9am and again at 10am on Monday. It sweeps the same inbox twice.", question: SWEEP, flags: { times: "0,1", naive: "true" }, expect: "duplicates" },
    { title: "One sweep for each day", why: "Hours 0 and 1 are Monday, and hour 24 is Tuesday. The board has two cards.", question: SWEEP, flags: { times: "0,1,24" }, expect: "once" },
    { title: "A webhook arrives twice", why: "GitHub delivers the same issue event two times. The second delivery is ignored.", question: ISSUE, flags: { events: "delivery-9001,delivery-9001" }, expect: "once" },
    { title: "NAIVE: a worker waits for Maya", why: "The worker waits inside the run for her yes. Its card says running all day.", question: DRAFT, flags: { times: "0", approval: "true", hold: "true" }, expect: "blocked" },
    { title: "Maya says yes a day later", why: "The draft waits as a card. Her yes on Tuesday wakes the run, and it sends the draft.", question: DRAFT, flags: { times: "0", approval: "true", approve: "24" }, expect: "resumed" },
    { title: "EDGE: Maya clicks yes twice", why: "The second click has its own key and is ignored, so the draft goes out once.", question: DRAFT, flags: { times: "0", approval: "true", approve: "24,25" }, expect: "resumed" },
    { title: "EDGE: the model fails", why: "The model is down. The board shows a failed card, so Maya can see it.", question: SWEEP, flags: { times: "0", fail: "true" }, expect: "failed" },
  ],
  play(question, flags) {
    const file = `${mkdtempSync(`${tmpdir()}/lab35-`)}/board.jsonl`;
    const llm = flags.fail ? broken() : modelFrom(flags);
    const hours = (flags.times || "").split(",").filter((hour) => hour !== "");
    const ids = (flags.events || "").split(",").filter((id) => id !== "");
    const yes = (flags.approve || "").split(",").filter((hour) => hour !== "");
    const approval = Boolean(flags.approval);
    const jobs = [{ name: "inbox-sweep", everyHours: 24, question, approval }];
    print(field("Request", question));
    rule("LOG, STEP BY STEP");
    for (const hour of hours) {
      const plan: Plan = { jobs, events: [] };
      let cards;
      if (flags.hold) cards = wakeAndWait(Number(hour), plan, file);
      else if (flags.naive) cards = wakeNaive(Number(hour), plan, llm, file);
      else cards = wake(Number(hour), plan, llm, file);
      console.log(dim(`Hour ${hour}: ${cards.length} run(s) started.`));
    }
    for (const id of ids) {
      const plan: Plan = { jobs: [], events: [{ id, question }] };
      console.log(dim(`Webhook ${id}: ${wake(0, plan, llm, file).length} run(s) started.`));
    }
    for (const hour of yes) {
      const card = approve(Number(hour), "inbox-sweep:0", file);
      console.log(dim(`Hour ${hour}: Maya said yes. ${card ? "The run woke up." : "Ignored."}`));
    }
    return judge(file);
  },
};

// Count the runs for each key. More than one means the work was done twice.
function judge(file: string): string {
  const runs: Record<string, number> = {};
  for (const line of readLines(file)) if (line.status === "running") runs[line.key] = (runs[line.key] || 0) + 1;
  const cards = boardOf(file);
  console.log();
  for (const card of cards) print(field(card.status.toUpperCase(), `${card.key}  ${card.note}`));
  let twice = false;
  for (const key in runs) if (runs[key] > 1) twice = true;
  if (twice) {
    box(badgeRed("DONE TWICE"), [red("One wakeup ran more than once.")], red);
    return "duplicates";
  }
  for (const card of cards) {
    if (card.status === "failed") {
      box(badgeGreen("FAILED, AND VISIBLE"), [green("The board shows the failure.")], green);
      return "failed";
    }
  }
  for (const card of cards) {
    if (card.status === "running") {
      box(badgeRed("BLOCKED"), [red("A worker is held, waiting for Maya.")], red);
      return "blocked";
    }
  }
  for (const card of cards) {
    if (card.note.startsWith("sent after")) {
      box(badgeGreen("RESUMED"), [green("Maya's yes woke the run. The draft went out once.")], green);
      return "resumed";
    }
  }
  box(badgeGreen("ONCE EACH"), [green(`${cards.length} card(s), each run one time.`)], green);
  return "once";
}
