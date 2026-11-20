// What you see on screen for the error feedback lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/16-error-feedback.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { fileTool, runWithFeedback, type Pair } from "../labs/16-error-feedback";

export const MAX_TRIES = 3;

// The naive way: the same checks, but the error says nothing the model can use.
export function naiveTool(call: Pair): string {
  const reply = fileTool(call);
  if (reply.startsWith("ERROR")) return "ERROR";
  return reply;
}

export const lab: Lab = {
  file: "16-error-feedback.ts",
  title: "A useful error",
  about:
    "Each example is a receipt the Expense Manager must file, such as the font licence. The model writes the filing call, reads each error, and fixes the call, up to 3 tries. Each try after a failure is a retry.",
  terms: ["retry", "hint", "ask-a-person"],
  challenge: "A bare ERROR gives the model no hint to fix. It repeats the same call until the loop runs out.",
  promise: "An error says what is valid. Retries are capped. A receipt that fits no category means we ask a person.",
  production: "Write every tool error for a reader that cannot ask questions. Name the allowed values, and count how often each error appears.",
  cases: [
    { title: "NAIVE: an error that says nothing", why: "The model writes the category fonts, which the API does not accept. The error only says ERROR, so the model sends the same call three times and gives up.", question: "File the font licence receipt.", flags: { naive: "true" }, expect: "gave-up" },
    { title: "A call that works", why: "The task names the category. Nothing to fix, so one try.", question: "File the cloud hosting bill as hosting.", expect: "answered" },
    { title: "A category the API does not know", why: "The model writes lunch. The error lists the five categories, so the model picks meals and tries again.", question: "File the Acme client lunch.", expect: "fixed" },
    { title: "A receipt id with a typo", why: "The model writes a receipt id that does not exist. The error lists the real ids, so the model picks the right one.", question: "Please book the train ticket as travel.", expect: "fixed" },
    { title: "EDGE: two mistakes in one call", why: "The receipt id is fixed first, then the category. That is three tries, which is exactly the limit.", question: "Next, the font licence receipt.", expect: "fixed" },
    { title: "A receipt that fits no category", why: "Gift cards are not software, meals, hosting, travel or office. The model must not pick one at random, so a person decides.", question: "Can you file the team gift cards?", expect: "ask-person" },
    { title: "A receipt nobody has seen", why: "There is no parking receipt in the books. The model cannot guess one, so a person decides.", question: "Please handle the parking fine from Friday.", expect: "ask-person" },
  ],
  play(question, flags) {
    print(field("Task", question));
    const tool = flags.naive ? naiveTool : fileTool;
    const result = runWithFeedback(question, modelFrom(flags), tool, MAX_TRIES);
    rule("LOG, STEP BY STEP");
    for (const line of result.log) {
      const failed = line.includes("ERROR") || line.includes("asked for a person");
      console.log(`${failed ? badgeRed("FAILED") : badgeGreen("OK    ")} ${dim(line)}`);
    }
    console.log();
    if (result.outcome === "ask-person") box(badgeYellow("ASK A PERSON"), [yellow("No category fits, so a person decides.")], yellow);
    if (result.outcome === "gave-up") box(badgeRed("GAVE UP"), [red(`Still failing after ${MAX_TRIES} tries. The error gave no hint.`)], red);
    if (result.outcome === "fixed") print(field("Fixed after", `${result.tries} tries`, green));
    return result.outcome;
  },
};
