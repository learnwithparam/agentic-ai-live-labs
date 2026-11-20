// What you see on screen for the stop conditions lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/15-stop-conditions.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { runLimited, runUnlimited } from "../labs/15-stop-conditions";
import { TOKENS_PER_CENT } from "../src/coding-tools";
import type { Limits } from "../labs/15-stop-conditions";

const FIX = "Fix the failing coupon test";

export const lab: Lab = {
  file: "15-stop-conditions.ts",
  title: "When the loop must stop",
  about:
    "The Coding Agent tries to fix the failing coupon test from build 2. One trip round the loop is a step. It allows 6 steps, 1 call made twice, 120 seconds and 6 cents. Change them with --steps, --repeats, --seconds and --cents. Try --model stuck to repeat one edit, or --model wanders to try new edits.",
  terms: ["step", "cap"],
  challenge: "A model that is stuck makes the same edit again and again. It never says it is done, and every round costs more than the last.",
  promise: "A run always stops within its steps, its time and its money, and says why it stopped. The same call twice stops it.",
  production: "Set the limits for each task. Alert when a run hits one. Show the stop reason to the person.",
  cases: [
    { title: "NAIVE: trust the model to stop", why: "The model makes the same edit again and again. With no limit of our own, the loop never ends. The demo cuts it at 200 rounds.", question: FIX, flags: { model: "stuck", naive: "true" }, expect: "never-stopped" },
    { title: "A model that fixes it", why: "One edit, one test run, then an answer. The normal case. No limit is touched.", question: FIX, expect: "answered" },
    { title: "The same edit twice", why: "The model sends the edit it already tried. Nothing changed, so a second try is a waste. The loop stops it and prints why.", question: FIX, flags: { model: "stuck" }, expect: "same-call" },
    { title: "A model that wanders", why: "New edits each time, so it is not a repeat. The step limit ends it.", question: FIX, flags: { model: "wanders", seconds: "9999" }, expect: "max-steps" },
    { title: "A slow test run", why: "Each test run takes 45 seconds. A model that tries new edits and runs the tests each time uses up the time cap.", question: FIX, flags: { model: "wanders", steps: "12", seconds: "90", cents: "50" }, expect: "out-of-time" },
    { title: "A small money cap", why: "Every round sends the whole chat again. A cap of 1 cent is gone by the third round.", question: FIX, flags: { cents: "1" }, expect: "out-of-money" },
    { title: "Two rounds only", why: "We allow two rounds. The model needs three, so we stop it, even though it was close to an answer.", question: FIX, flags: { steps: "2" }, expect: "max-steps" },
    { title: "A fair retry", why: "A test can fail by chance, so a retry can be fair. Here the repeat limit is raised to 9, and the step limit ends the run instead.", question: FIX, flags: { model: "stuck", repeats: "9", steps: "3" }, expect: "max-steps" },
  ],
  play(question, flags) {
    const limits: Limits = {
      maxSteps: Number(flags.steps || 6),
      maxRepeats: Number(flags.repeats || 1),
      maxSeconds: Number(flags.seconds || 120),
      maxCents: Number(flags.cents || 6),
    };
    const model = modelFrom(flags);
    print(field("Task", question));
    print(field("Limits", `${limits.maxSteps} steps, ${limits.maxRepeats} same call, ${limits.maxSeconds} s, ${limits.maxCents} cents`));
    const run = flags.naive ? runUnlimited(question, model, 200) : runLimited(question, model, limits);
    rule("LOG, STEP BY STEP");
    for (const line of run.log.slice(0, 8)) console.log(dim(line));
    if (run.log.length > 8) console.log(dim(`... and ${run.log.length - 8} more lines`));
    console.log();
    const cents = (run.spent / TOKENS_PER_CENT).toFixed(1);
    print(field("Rounds", String(run.steps)));
    print(field("Time", `${run.seconds} seconds`));
    print(field("Spent", `${run.spent} tokens, ${cents} cents`, Number(cents) > limits.maxCents ? red : green));
    if (run.stopped === "answered") box(badgeGreen("ANSWERED"), [green(run.answer)], green);
    else if (run.stopped === "never-stopped") box(badgeRed("NEVER STOPPED"), [red("Cut by the demo. A real run would go on and on.")], red);
    else box(badgeYellow(run.stopped.toUpperCase()), [yellow(`Stopped because: ${run.stopped}`)], yellow);
    return run.stopped;
  },
};
