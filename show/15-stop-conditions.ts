// What you see on screen for lab 15: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/15-stop-conditions.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { runLimited, runUnlimited } from "../labs/15-stop-conditions";
import type { Limits } from "../labs/15-stop-conditions";

export const lab: Lab = {
  file: "15-stop-conditions.ts",
  title: "Lab 15: when the loop must stop",
  about:
    "Each example asks one question. The loop allows 6 steps, 2 identical calls and 400 tokens. Change them with --steps, --repeats and --budget. A real model answers fast, so two pretend habits are on the shelf: --model stuck repeats one search, and --model wanders tries new words every time.",
  terms: "step = one trip round the loop. repeat = the same call again. budget = the most we allow a run to spend.",
  challenge: "A model that is stuck never says it is done. A loop that trusts the model runs and bills forever.",
  promise: "A run always stops within its steps and its budget, and says why it stopped.",
  production: "Set the limits per task, alert when a run hits one, and show the stop reason to the person.",
  cases: [
    { title: "NAIVE: trust the model to stop", why: "The model keeps making the same call. With no limit of our own, the loop never ends. The demo cuts it at 200 rounds.", question: "What is the dose of Zorbex?", flags: { model: "stuck", naive: "true" }, expect: "never-stopped" },
    { title: "A model that answers", why: "One search, then an answer. The normal case. No limit is touched.", question: "What is the dose of Cardioza?", expect: "answered" },
    { title: "A model that is stuck", why: "The same call again and again. We allow it twice, because a retry can be fair. The third time we stop.", question: "What is the dose of Zorbex?", flags: { model: "stuck" }, expect: "repeat" },
    { title: "A model that wanders", why: "New words each time, so it is not a repeat. The step limit ends it.", question: "What is the dose of Zorbex?", flags: { model: "wanders" }, expect: "max-steps" },
    { title: "A small budget", why: "Every round sends the whole chat again. A budget of 20 tokens is gone before the model is asked a second time.", question: "What is the dose of Cardioza?", flags: { budget: "20" }, expect: "out-of-budget" },
    { title: "One step only", why: "We allow one round. The model wants a second one, so we stop it, even though it was close to an answer.", question: "What is the dose of Cardioza?", flags: { steps: "1" }, expect: "max-steps" },
    { title: "A fair retry", why: "Two identical calls are allowed. A model that retries once and then answers is fine. Here the limit is raised to show the rule.", question: "What is the dose of Zorbex?", flags: { model: "stuck", repeats: "9", steps: "3" }, expect: "max-steps" },
  ],
  play(question, flags) {
    const limits: Limits = {
      maxSteps: Number(flags.steps || 6),
      maxRepeats: Number(flags.repeats || 2),
      budget: Number(flags.budget || 400),
    };
    const model = modelFrom(flags);
    print(field("Question", question));
    print(field("Limits", `${limits.maxSteps} steps, ${limits.maxRepeats} identical calls, ${limits.budget} tokens`));
    const run = flags.naive ? runUnlimited(question, "US", model, 200) : runLimited(question, "US", model, limits);
    rule("LOG, STEP BY STEP");
    for (const line of run.log.slice(0, 8)) console.log(dim(line));
    if (run.log.length > 8) console.log(dim(`... and ${run.log.length - 8} more lines`));
    console.log();
    print(field("Rounds", String(run.steps)));
    print(field("Spent", `${run.spent} tokens`, run.spent > limits.budget ? red : green));
    if (run.stopped === "answered") box(badgeGreen("ANSWERED"), [green(run.answer)], green);
    else if (run.stopped === "never-stopped") box(badgeRed("NEVER STOPPED"), [red("Cut by the demo. A real run would go on and on.")], red);
    else box(badgeYellow(run.stopped.toUpperCase()), [yellow(`Stopped because: ${run.stopped}`)], yellow);
    return run.stopped;
  },
};
