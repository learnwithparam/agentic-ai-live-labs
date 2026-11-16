// What you see on screen for lab 13: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/13-pick-context.ts.

import { modelFrom, type Lab } from "../src/runner";
import { SOURCES } from "../src/sources";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { answerFromPicked, costOf } from "../labs/13-pick-context";
import { countTokens } from "../labs/10-context-budget";

export const lab: Lab = {
  file: "13-pick-context.ts",
  title: "Lab 13: picking what goes in",
  about:
    "Each example is a question from Dr. Lee. Three sources are on the shelf: documents, the doctor's profile and past emails. We load only the ones the question needs.",
  terms: "source = a place facts come from. picking = choosing sources per question. overloaded = more context than the question needs.",
  challenge: "Loading everything is easy. It costs tokens, hides the useful part, and shows private data that has nothing to do with the question.",
  promise: "A question loads only the sources whose keyword it holds. A question with no keyword loads nothing, and the agent asks.",
  production: "Let the model choose with a tool call, and log which sources each answer used.",
  cases: [
    { title: "NAIVE: load every source", why: "Every question carries the documents, the profile and the emails. A dose question does not need the emails, and now the model can quote them.", question: "What is the Cardioza dose?", flags: { naive: "true" }, expect: "overloaded" },
    { title: "A dose question", why: "Only the documents are loaded. The profile and the emails stay on the shelf.", question: "What is the Cardioza dose?", expect: "picked" },
    { title: "An email question", why: "Only the emails are loaded.", question: "Which email was sent to me last?", expect: "picked" },
    { title: "Two needs in one question", why: "The question needs the profile and the documents, so both are loaded. The emails are not.", question: "Given my profile, what is the label?", expect: "picked" },
    { title: "Capital letters", why: "The model reads the meaning, so shouting changes nothing.", question: "DOSE???", expect: "picked" },
    { title: "Small talk", why: "No source helps. We load nothing, and the agent asks what the doctor needs.", question: "Hello there", expect: "unclear" },
    { title: "EDGE: a word used in another way", why: "A doctor jokes about email. A word list would load the emails. The model reads the meaning, so it can load nothing.", question: "I never read my email anyway", expect: "unclear" },
    { title: "An empty question", why: "No question means no source helps, so nothing is loaded.", question: "", expect: "unclear" },
  ],
  play(question, flags) {
    print(field("Question", question || "(empty)"));
    const everything = costOf(SOURCES);
    if (flags.naive) return showNaive(everything);
    const answered = answerFromPicked(question, SOURCES, modelFrom(flags));
    const picked = answered.picked;
    rule("LOG, STEP BY STEP");
    for (const line of answered.log) console.log(dim(line));
    console.log();
    rule("SOURCES");
    for (const source of SOURCES) {
      const loaded = picked.includes(source);
      const badge = loaded ? badgeGreen("LOADED") : badgeYellow("SKIPPED");
      console.log(`${badge} ${source.name.padEnd(10)} ${dim(`${countTokens(source.text)} tokens`)}`);
    }
    print(field("Tokens", `${costOf(picked)} of ${everything}`, green));
    if (picked.length > 0) return "picked";
    box("UNCLEAR", [yellow("No source matches. The agent should ask what the doctor needs.")], yellow);
    return "unclear";
  },
};

function showNaive(everything: number): string {
  rule("SOURCES");
  for (const source of SOURCES) console.log(`${badgeRed("LOADED")} ${source.name}`);
  box(badgeRed("OVERLOADED"), [red(`${everything} tokens sent, whatever the question was.`)], red);
  return "overloaded";
}
