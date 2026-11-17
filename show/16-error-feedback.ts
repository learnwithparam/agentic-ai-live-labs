// What you see on screen for lab 16: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/16-error-feedback.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { doseTool, naiveTool, runWithFeedback } from "../labs/16-error-feedback";

export const MAX_TRIES = 3;

export const lab: Lab = {
  file: "16-error-feedback.ts",
  title: "Lab 16: a useful error",
  about:
    "Each example is a question like Cardioza in Germany. The model writes the tool call, reads each error, and fixes the call, up to 3 tries.",
  terms: "retry = try the call again. hint = what the error says is valid. ask a person = stop, because only they know what was meant.",
  challenge: "A bare ERROR gives the model nothing to fix. It repeats itself until the loop runs out.",
  promise: "An error says what is valid. Retries are capped. A call that cannot be fixed goes to a person.",
  production: "Write every tool error for a reader that cannot ask questions, and count how often each error appears.",
  cases: [
    { title: "NAIVE: an error that says nothing", why: "The country is Germany, which the tool does not accept. The error only says ERROR, so the model sends the same call three times and gives up.", question: "What is the dose of Cardioza in Germany?", flags: { naive: "true" }, expect: "gave-up" },
    { title: "A call that works", why: "Nothing to fix. One try.", question: "What is the dose of Cardioza in the US?", expect: "answered" },
    { title: "A country spelled out", why: "The error says to use US or DE. The model maps Germany to DE and tries again.", question: "What is the dose of Cardioza in Germany?", expect: "fixed" },
    { title: "A drug with a typo", why: "The error lists the known drugs. The model picks the one that looks like its typo.", question: "What is the dose of Cardiozza in the US?", expect: "fixed" },
    { title: "EDGE: two mistakes in one call", why: "The country is fixed first, then the drug. That is three tries, which is exactly the limit.", question: "What is the dose of Cardiozza in Germany?", expect: "fixed" },
    { title: "A country we do not serve", why: "France is not US or DE. The model must not swap it for US, because that is a different doctor's label. A person decides.", question: "What is the dose of Cardioza in France?", expect: "ask-person" },
    { title: "A drug nobody knows", why: "Zorbex is not close to any known drug. Guessing could be dangerous, so a person decides.", question: "What is the dose of Zorbex in the US?", expect: "ask-person" },
    { title: "Valid call, no document", why: "Dermalin has no German document. That is not an error, so there is no retry. The answer is no source.", question: "What is the dose of Dermalin in Germany?", expect: "no-source" },
  ],
  play(question, flags) {
    print(field("Question", question));
    const tool = flags.naive ? naiveTool : doseTool;
    const result = runWithFeedback(question, modelFrom(flags), tool, MAX_TRIES);
    rule("LOG, STEP BY STEP");
    for (const line of result.log) {
      const failed = line.includes("ERROR") || line.includes("asked for a person");
      console.log(`${failed ? badgeRed("FAILED") : badgeGreen("OK    ")} ${dim(line)}`);
    }
    console.log();
    if (result.outcome === "ask-person") box(badgeYellow("ASK A PERSON"), [yellow("The error cannot be fixed without changing what was asked.")], yellow);
    if (result.outcome === "gave-up") box(badgeRed("GAVE UP"), [red(`Still failing after ${MAX_TRIES} tries. The error gave no hint.`)], red);
    if (result.outcome === "fixed") print(field("Fixed after", `${result.tries} tries`, green));
    return result.outcome;
  },
};
