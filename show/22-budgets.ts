// What you see on screen for lab 22: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/22-budgets.ts.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { charge, showCents } from "../src/spend";
import { runUncapped, runWithBudget } from "../labs/22-budgets";
import type { Run } from "../labs/22-budgets";

const DAY = "2026-11-17";

export const lab: Lab = {
  file: "22-budgets.ts",
  title: "Lab 22: money caps",
  about:
    "Each example runs the loop with a cost cap. The run cap is 1 cent and the day cap is 3 cents, so you see them hit. Change them with --run and --day (whole cents). Also use --before (millicents spent today), --hops and --again (runs in a row).",
  terms: "millicent = a thousandth of a cent, so every amount is a whole number. cap = a limit we set. worst case = the price if the model uses its longest answer. hop = one agent handing work to another.",
  challenge: "A stuck model keeps spending, and one person can start many runs in a day. A count of tokens does not stop a company bill.",
  promise: "A call never starts if its worst case would pass the run cap or the day cap. What a call really cost is written to disk. A run handed on too many times is refused.",
  production: "Take the price list from your provider. Keep the ledger in a database that every server shares. Alert a person when a cap is hit.",
  cases: [
    { title: "NAIVE: no money cap", why: "The model keeps making the same call, and nothing in our code counts money. The demo cuts it at 200 rounds, and the bill is long.", question: "What is the dose of Zorbex?", flags: { model: "stuck", naive: "true" }, expect: "never-stopped" },
    { title: "A normal question", why: "Two rounds, a fraction of a cent. No cap is touched.", question: "What is the dose of Cardioza?", expect: "answered" },
    { title: "A stuck model and a run cap", why: "Each round sends the whole chat again, so each round costs more. The run cap of 1 cent stops it before the call that would pass it.", question: "What is the dose of Zorbex?", flags: { model: "stuck" }, expect: "run-cap" },
    { title: "EDGE: today's money is already used", why: "This person spent 2500 millicents earlier today. The day cap is 3000. The worst case of the next call does not fit, so no call starts.", question: "What is the dose of Cardioza?", flags: { before: "2500" }, expect: "day-cap" },
    { title: "EDGE: handed on too many times", why: "This run is the third hand-over, and the cap is three hops. It is refused before any money is spent.", question: "What is the dose of Cardioza?", flags: { hops: "3" }, expect: "hop-cap" },
    { title: "EDGE: many runs in one day", why: "Each run is small. The ledger on disk adds them up. The day cap stops the second run in a row.", question: "What is the dose of Cardioza?", flags: { again: "3", day: "1" }, expect: "day-cap" },
  ],
  play(question, flags) {
    process.env.SPEND_DIR = mkdtempSync(`${tmpdir()}/lab22-`);
    const caps = {
      run: Number(flags.run || 1) * 1000,
      day: Number(flags.day || 3) * 1000,
      hops: 3,
      rounds: 6,
      maxOut: 100,
    };
    const who = { user: "dr-lee", day: DAY, hops: Number(flags.hops || 0) };
    if (flags.before) charge(who.user, DAY, Number(flags.before));
    print(field("Question", question));
    print(field("Caps", `run ${showCents(caps.run)}, day ${showCents(caps.day)}, ${caps.hops} hops`));
    rule("LOG, STEP BY STEP");
    let run: Run;
    const model = modelFrom(flags);
    if (flags.naive) run = runUncapped(question, "US", model, who);
    else run = runWithBudget(question, "US", model, caps, who);
    for (const line of run.log.slice(0, 8)) console.log(dim(line));
    if (run.log.length > 8) console.log(dim(`... and ${run.log.length - 8} more lines`));
    for (let again = 2; again <= Number(flags.again || 1); again++) {
      run = runWithBudget(question, "US", model, caps, who);
      console.log(dim(`Run ${again}: ${run.stopped}, cost ${run.cost} millicents.`));
    }
    return report(run, caps.run);
  },
};

function report(run: Run, runCap: number): string {
  console.log();
  print(field("Rounds", String(run.rounds)));
  print(field("Cost", showCents(run.cost), run.cost > runCap ? red : green));
  if (run.stopped === "answered") box(badgeGreen("ANSWERED"), [green(run.answer)], green);
  else if (run.stopped === "never-stopped") box(badgeRed("NEVER STOPPED"), [red("Cut by the demo. A real bill would keep growing.")], red);
  else box(badgeYellow(run.stopped.toUpperCase()), [yellow(`Stopped because: ${run.stopped}`)], yellow);
  return run.stopped;
}
