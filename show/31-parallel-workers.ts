// What you see on screen for the parallel workers lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/31-parallel-workers.ts.
// Each worker is a real child program. Each of the three systems takes a second to answer.

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { doWork, makeBrief, makeBriefSlowly } from "../labs/31-parallel-workers";

const ASK = "Please prepare a call brief for Dr. Lee.";
const LIMIT_MS = 8000;

export const lab: Lab = {
  file: "31-parallel-workers.ts",
  title: "Parallel workers",
  about:
    "Each example prepares a call brief from three systems. A worker reads each system, and the workers run in parallel. Pick the doctor with --hcp. Make a system fail with --stuck or --crash, and name it: docs, profile or emails.",
  terms: ["parallel", "deadline", "merge", "worker"],
  challenge: "Three slow systems one after another take three seconds. One stuck system holds up the whole brief, and the rep walks into the call with nothing.",
  promise: "All workers start at once. A worker that is late is stopped at the deadline, and one that crashes is named. The brief goes out with the parts that came back.",
  production: "Give each worker its own result file, so none overwrites another. Set the deadline from how long the rep can wait. The merge keeps the parts that came back.",
  cases: [
    { title: "NAIVE: one system after another", why: "The systems run in a line. Three seconds go by before the brief is ready.", question: ASK, flags: { hcp: "H-1", naive: "true" }, expect: "slow" },
    { title: "Three workers at once", why: "All three start together. The brief is ready in about one second.", question: ASK, flags: { hcp: "H-1" }, expect: "complete" },
    { title: "A German doctor", why: "Dr. Weber has no emails. That worker answers that there are none, and the brief is still complete.", question: "Please prepare a call brief for Dr. Weber.", flags: { hcp: "H-2" }, expect: "complete" },
    { title: "EDGE: one system is stuck", why: "The emails system never answers. The lead stops it at the deadline and sends the rest.", question: ASK, flags: { hcp: "H-1", stuck: "emails" }, expect: "partial" },
    { title: "EDGE: one worker crashes", why: "The profile worker dies. The brief names the missing part, and the other two come through.", question: ASK, flags: { hcp: "H-1", crash: "profile" }, expect: "partial" },
  ],
  play(question, flags) {
    const hcp = flags.hcp || "H-1";
    const dir = mkdtempSync(`${tmpdir()}/lab31-`);
    process.env.LIVE_FLAG = flags.live || "";
    print(field("Request", question));
    const modes: Record<string, string> = {};
    if (flags.stuck) modes[flags.stuck] = "stuck";
    if (flags.crash) modes[flags.crash] = "crash";
    let brief;
    if (flags.naive) brief = makeBriefSlowly(hcp, dir, LIMIT_MS);
    else brief = makeBrief(hcp, dir, modes, LIMIT_MS);
    rule("LOG, STEP BY STEP");
    let missing = 0;
    for (const part of brief.parts) {
      if (part.ok) console.log(dim(`${part.name}: came back.`));
      else console.log(red(`${part.name}: missing, ${part.why}.`));
      if (!part.ok) missing += 1;
    }
    console.log();
    for (const part of brief.parts) if (part.ok) print(field(part.name, part.text.slice(0, 90)));
    print(field("Time", `${brief.seconds.toFixed(1)} seconds`));
    if (flags.naive && brief.seconds >= 2.5) {
      box(badgeRed("SLOW"), [red("The brief waited for each system in turn.")], red);
      return "slow";
    }
    if (missing > 0) {
      box(badgeGreen("PARTIAL BRIEF"), [green(`${missing} part missing, and named.`)], green);
      return "partial";
    }
    box(badgeGreen("COMPLETE"), [green("All three parts came back.")], green);
    return "complete";
  },
};

// The child program. It does its one job, takes its second, and writes its own result file.
if (import.meta.main && process.argv[2] === "worker") {
  const [, , , name, hcp, dir, mode, live] = process.argv;
  const callLlm = modelFrom(live ? { live } : {});
  const delay = Number(process.env.WORKER_DELAY_MS || 1000);
  if (mode === "crash") process.exit(1);
  if (mode === "stuck") Bun.sleepSync(30000);
  Bun.sleepSync(delay);
  writeFileSync(`${dir}/${name}.txt`, doWork(name, hcp, callLlm));
}
