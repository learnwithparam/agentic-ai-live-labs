// What you see on screen for the subagent isolation lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/32-subagent-isolation.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { answerAlone, answerWithHelper } from "../labs/32-subagent-isolation";

const WEEK = "Which builds failed this week, and why?";
export const SPACE_LIMIT = 1500;

export const lab: Lab = {
  file: "32-subagent-isolation.ts",
  title: "Keep noisy work apart",
  about:
    "Each example triages forty CI build logs for the Bug Triage bot. A helper reads all the logs in its own context, and sends back a short report. Choose how the model acts with --model.",
  terms: ["helper", "context", "report"],
  challenge: "Forty logs hold pages of quiet lines. If the main agent reads them all, its context is full of junk. The real failures are hard to find.",
  promise: "The helper reads the logs, and the main agent keeps only a short report. It checks every line of the report against the real logs before it answers.",
  production: "Give the helper its own model call and its own tools. Cap the size of the report. Log how much the helper read, so you can see a helper that reads too much.",
  cases: [
    { title: "NAIVE: the main agent reads everything", why: "The main agent reads all forty logs by itself. Its space fills with quiet lines.", question: "Triage this week's CI logs.", flags: { naive: "true" }, expect: "flooded" },
    { title: "A helper reads the logs", why: "The helper reads the forty logs. The main agent keeps three short lines.", question: WEEK, expect: "clean" },
    { title: "A question about one test", why: "The report names the coupon test in build-2 and build-3. It stays three short lines.", question: "Why did the coupon test break?", expect: "clean" },
    { title: "A question about time outs", why: "The helper finds one build that timed out. The main agent keeps the same short report.", question: "Did anything time out overnight?", expect: "clean" },
    { title: "EDGE: the helper makes up a build", why: "The helper lists a build that is not in the logs. The main agent checks the report and refuses it.", question: "Which builds failed for Acme?", flags: { model: "invent" }, expect: "no-answer" },
    { title: "EDGE: the helper gets stuck", why: "The helper never finishes. The main agent gets a short failure note, not the helper's whole log.", question: "Which builds failed before the launch?", flags: { model: "stuck" }, expect: "no-answer" },
  ],
  play(question, flags) {
    const callLlm = modelFrom(flags);
    print(field("Question", question));
    let done;
    if (flags.naive) done = answerAlone(question, callLlm);
    else done = answerWithHelper(question, callLlm);
    rule("LOG, STEP BY STEP");
    for (const line of done.log) console.log(dim(line));
    print(field("Answer", done.answer.split("\n").join(" | ").slice(0, 160)));
    print(field("Main space", `${done.mainChars} characters (limit ${SPACE_LIMIT})`));
    if (done.mainChars > SPACE_LIMIT) {
      box(badgeRed("FLOODED"), [red("The main agent read every log.")], red);
      return "flooded";
    }
    if (done.answer.startsWith("I found no")) {
      box(badgeGreen("NO ANSWER"), [green("Short space, and no made-up build.")], green);
      return "no-answer";
    }
    box(badgeGreen("CLEAN"), [green("A short space and a checked answer.")], green);
    return "clean";
  },
};
