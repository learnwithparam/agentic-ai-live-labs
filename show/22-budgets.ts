// What you see on screen for the budgets lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/22-budgets.ts.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { charge, showCents, showMoney } from "../src/spend";
import { runUncapped, runWithBudget } from "../labs/22-budgets";
import type { Run } from "../labs/22-budgets";

const DAY = "2026-11-17";

export const lab: Lab = {
  file: "22-budgets.ts",
  title: "Money caps",
  about:
    "Each example reads one email with the Inbox Manager bot. The run cap is 1 cent and the day cap is 3 cents, so you see them hit. Change them with --run and --day, in whole cents. Also use --mail, --before (millicents spent today), --hops and --again.",
  terms: ["budget", "millicent", "cap", "worst-case", "hop"],
  challenge: "One email carries a 300 page PDF, and a stuck bot reads it again and again. A count of tokens does not stop a company bill.",
  promise: "A call never starts if its worst case would pass a cap. What a call really cost is written to disk. A run with too many hops is refused.",
  production: "Price the worst case before each call. Refuse any call that would pass the run cap or the day cap. Keep the ledger in a shared database, and tell Maya when a cap is hit.",
  cases: [
    { title: "NAIVE: no money cap", why: "Maya got a 300 page PDF from Acme. The bot is stuck and opens it again and again. Our code does not count money. The demo cuts it at 200 rounds, and the bill is huge.", question: "Read the Acme report and note what it says", flags: { mail: "mail-report", model: "stuck", naive: "true" }, expect: "never-stopped" },
    { title: "A normal email", why: "Sam asks to move a call. Two rounds, a fraction of a cent. No cap is touched.", question: "Note Sam's request about Thursday", flags: { mail: "mail-meeting" }, expect: "answered" },
    { title: "A stuck bot and a run cap", why: "Each round sends the whole chat again, so each round costs more. The run cap of 1 cent stops it before the call that would pass it.", question: "Write a one line note for the receipt", flags: { mail: "mail-receipt", model: "stuck" }, expect: "run-cap" },
    { title: "EDGE: the 300 page PDF, worst case first", why: "The bot is fine, but the PDF is 150000 tokens. The worst case of that call is over two dollars. The call is refused before it starts.", question: "Does the Acme report mention the logo?", flags: { mail: "mail-report" }, expect: "run-cap" },
    { title: "EDGE: today's money is already used", why: "Maya's bots spent 2800 millicents earlier today. The day cap is 3000. The worst case of the next call does not fit, so no call starts.", question: "Is the contract email signed?", flags: { mail: "mail-contract", before: "2800" }, expect: "day-cap" },
    { title: "EDGE: handed on too many times", why: "This run is the third hand-over, and the cap is three hops. It is refused before any money is spent.", question: "Pass this invoice note to the Expense Manager", flags: { mail: "mail-receipt", hops: "3" }, expect: "hop-cap" },
    { title: "EDGE: many runs in one day", why: "Each run is small. The ledger on disk adds them up. The day cap stops a later run.", question: "Sort the morning emails, one by one", flags: { mail: "mail-spam", again: "3", day: "1" }, expect: "day-cap" },
  ],
  play(question, flags) {
    process.env.SPEND_DIR = mkdtempSync(`${tmpdir()}/lab22-`);
    const caps = {
      run: Number(flags.run || 1) * 1000,
      day: Number(flags.day || 3) * 1000,
      hops: 3,
      rounds: 6,
      maxOut: 60,
    };
    const who = { user: "maya", day: DAY, hops: Number(flags.hops || 0) };
    if (flags.before) charge(who.user, DAY, Number(flags.before));
    const mail = String(flags.mail || "mail-meeting");
    print(field("Task", question));
    print(field("Email", mail));
    print(field("Caps", `run ${showCents(caps.run)}, day ${showCents(caps.day)}, ${caps.hops} hops`));
    rule("LOG, STEP BY STEP");
    let run: Run;
    const model = modelFrom(flags);
    if (flags.naive) run = runUncapped(question, mail, model, who);
    else run = runWithBudget(question, mail, model, caps, who);
    for (const line of run.log.slice(0, 8)) console.log(dim(line));
    if (run.log.length > 8) console.log(dim(`... and ${run.log.length - 8} more lines`));
    for (let again = 2; again <= Number(flags.again || 1); again++) {
      run = runWithBudget(question, mail, model, caps, who);
      console.log(dim(`Run ${again}: ${run.stopped}, cost ${run.cost} millicents.`));
    }
    return report(run, caps.run);
  },
};

function report(run: Run, runCap: number): string {
  console.log();
  print(field("Rounds", String(run.rounds)));
  print(field("Cost", showMoney(run.cost), run.cost > runCap ? red : green));
  if (run.stopped === "answered") box(badgeGreen("ANSWERED"), [green(run.answer)], green);
  else if (run.stopped === "never-stopped") box(badgeRed("NEVER STOPPED"), [red(`Cut by the demo. A real bill would keep growing: ${showMoney(run.cost)} so far.`)], red);
  else box(badgeYellow(run.stopped.toUpperCase()), [yellow(`Stopped because: ${run.stopped}`)], yellow);
  return run.stopped;
}
