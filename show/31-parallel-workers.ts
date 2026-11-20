// What you see on screen for the parallel workers lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/31-parallel-workers.ts.
// Each worker is a real child program. Each of the four sources takes a second to answer.

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import type { Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { doWork, makeBrief, makeBriefSlowly, writeNote } from "../labs/31-parallel-workers";

const ASK = "Research the rival of the bakery before Friday.";
const LIMIT_MS = 8000;

export const lab: Lab = {
  file: "31-parallel-workers.ts",
  title: "Parallel workers",
  about:
    "Each example researches a prospect's rival for a pitch. A worker reads each of four sources, and the workers run in parallel. Pick the prospect with --prospect. Make a source fail with --stuck or --crash, and name it: site, social, pricing or clients.",
  terms: ["parallel", "deadline", "merge", "worker"],
  challenge: "Four slow sources one after another take four seconds. One stuck source holds up the whole note, and the team walks into the pitch with nothing.",
  promise: "All workers start at once. A worker that is late is stopped at the deadline, and one that crashes is named. One writer merges the parts that came back.",
  production: "Give each worker its own result file, so none overwrites another. Set the deadline from how long the team can wait. The merge keeps the parts that came back.",
  cases: [
    { title: "NAIVE: one source after another", why: "The sources run in a line. Four seconds go by before the note is ready.", question: ASK, flags: { prospect: "prospect-bakery", naive: "true" }, expect: "slow" },
    { title: "Four workers at once", why: "All four start together. The note is ready in about one second.", question: ASK, flags: { prospect: "prospect-bakery" }, expect: "complete" },
    { title: "A different prospect", why: "The gym has a rival with a busy social feed. The same four workers still run at once.", question: "Research the rival of the gym before Friday.", flags: { prospect: "prospect-gym" }, expect: "complete" },
    { title: "EDGE: one source is stuck", why: "The social feed never answers. The lead stops that worker at the deadline and sends the rest.", question: ASK, flags: { prospect: "prospect-bakery", stuck: "social" }, expect: "partial" },
    { title: "EDGE: one worker crashes", why: "The pricing worker dies. The note names the missing part, and the other three come through.", question: ASK, flags: { prospect: "prospect-bakery", crash: "pricing" }, expect: "partial" },
  ],
  play(question, flags) {
    const prospect = flags.prospect || "prospect-bakery";
    const dir = mkdtempSync(`${tmpdir()}/lab31-`);
    print(field("Request", question));
    const modes: Record<string, string> = {};
    if (flags.stuck) modes[flags.stuck] = "stuck";
    if (flags.crash) modes[flags.crash] = "crash";
    let brief;
    if (flags.naive) brief = makeBriefSlowly(prospect, dir, LIMIT_MS);
    else brief = makeBrief(prospect, dir, modes, LIMIT_MS);
    rule("LOG, STEP BY STEP");
    let missing = 0;
    for (const part of brief.parts) {
      if (part.ok) console.log(dim(`${part.name}: came back.`));
      else console.log(red(`${part.name}: missing, ${part.why}.`));
      if (!part.ok) missing += 1;
    }
    console.log();
    rule("THE NOTE");
    console.log(writeNote(brief));
    print(field("Time", `${brief.seconds.toFixed(1)} seconds`));
    if (flags.naive && brief.seconds >= 3.5) {
      box(badgeRed("SLOW"), [red("The note waited for each source in turn.")], red);
      return "slow";
    }
    if (missing > 0) {
      box(badgeGreen("PARTIAL NOTE"), [green(`${missing} part missing, and named.`)], green);
      return "partial";
    }
    box(badgeGreen("COMPLETE"), [green("All four parts came back.")], green);
    return "complete";
  },
};

// The child program. It does its one job, takes its second, and writes its own result file.
if (import.meta.main && process.argv[2] === "worker") {
  const [, , , name, prospect, dir, mode] = process.argv;
  const delay = Number(process.env.WORKER_DELAY_MS || 1000);
  if (mode === "crash") process.exit(1);
  if (mode === "stuck") Bun.sleepSync(30000);
  Bun.sleepSync(delay);
  writeFileSync(`${dir}/${name}.txt`, doWork(name, prospect));
}
