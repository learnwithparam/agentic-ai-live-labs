// What you see on screen for the wakeups and board lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/35-wakeups-and-board.ts.
// Time is a number of hours. A tick at hour 5 and a tick at hour 25 are in different days.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { readLines } from "../src/jobs";
import type { CallLlm } from "../src/model";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { boardOf, wake, wakeNaive, type Plan } from "../labs/35-wakeups-and-board";

const DAILY = "Check the Cardioza dose for Dr. Lee every day.";
const LABEL = "Check the Cardioza dose when a new label is posted.";

function broken(): CallLlm {
  return () => {
    throw new Error("the model is down");
  };
}

export const lab: Lab = {
  file: "35-wakeups-and-board.ts",
  title: "Wake the bot and show its work",
  about:
    "Each example wakes a bot. Give the hours of each wakeup with --times. Give webhook ids with --events, and send the same id twice to see a repeat. Each slot runs its job once. Add --fail true to make the model fail.",
  terms: ["wakeup", "slot", "board", "idempotent"],
  challenge: "A bot that wakes by itself can run twice, and nobody sees it. A tick repeats, or a webhook arrives twice, and the work is done again.",
  promise: "A key runs once, so the job is idempotent. Every run is a card on the board, and a failed run is a card that says failed.",
  production: "Use your scheduler or a queue, and keep the keys in a database. Alert a person when a card says failed, or says running for too long.",
  cases: [
    { title: "NAIVE: every wakeup runs", why: "The bot wakes at hour 0 and again at hour 5, which is the same day. It does the day's work twice.", question: DAILY, flags: { times: "0,5", naive: "true" }, expect: "duplicates" },
    { title: "One run for each day", why: "Hours 0 and 5 are one day, and hour 25 is the next. The board has two cards.", question: DAILY, flags: { times: "0,5,25" }, expect: "once" },
    { title: "A webhook arrives twice", why: "The same label event is delivered two times. The second delivery is ignored.", question: LABEL, flags: { events: "cardioza-label-v2,cardioza-label-v2" }, expect: "once" },
    { title: "EDGE: the model fails", why: "The model is down. The board shows a failed card, so a person can see it.", question: DAILY, flags: { times: "0", fail: "true" }, expect: "failed" },
  ],
  play(question, flags) {
    const file = `${mkdtempSync(`${tmpdir()}/lab35-`)}/board.jsonl`;
    const llm = flags.fail ? broken() : modelFrom(flags);
    const hours = (flags.times || "").split(",").filter((hour) => hour !== "");
    const ids = (flags.events || "").split(",").filter((id) => id !== "");
    const jobs = [{ name: "daily-dose-check", everyHours: 24, hcpId: "dr-lee", question }];
    print(field("Request", question));
    rule("LOG, STEP BY STEP");
    for (const hour of hours) {
      const plan: Plan = { jobs, events: [] };
      const cards = flags.naive ? wakeNaive(Number(hour), plan, llm, file) : wake(Number(hour), plan, llm, file);
      console.log(dim(`Hour ${hour}: ${cards.length} run(s) started.`));
    }
    for (const id of ids) {
      const plan: Plan = { jobs: [], events: [{ id, hcpId: "dr-lee", question }] };
      console.log(dim(`Webhook ${id}: ${wake(0, plan, llm, file).length} run(s) started.`));
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
  box(badgeGreen("ONCE EACH"), [green(`${cards.length} card(s), each run one time.`)], green);
  return "once";
}
