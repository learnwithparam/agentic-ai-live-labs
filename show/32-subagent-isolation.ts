// What you see on screen for lab 32: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/32-subagent-isolation.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { answerAlone, answerWithHelper } from "../labs/32-subagent-isolation";

const DOSE = "What is the dose of Cardioza for Dr. Lee?";
export const SPACE_LIMIT = 1500;

export const lab: Lab = {
  file: "32-subagent-isolation.ts",
  title: "Lab 32: keep noisy work apart",
  about:
    "Each example asks for a dose. The document search returns forty old drafts with wrong doses. Pick the doctor with --hcp, and pick how the model acts with --model.",
  terms: "helper = a second agent with its own space. context = everything an agent has read so far. report = the short answer the helper sends back.",
  challenge: "A search can return pages of old and wrong text. If the main agent reads it all, its space is full of junk, and it may copy a wrong dose.",
  promise: "The helper reads the noise, and the main agent keeps only a short report. It checks the report against the approved source before it answers.",
  production: "Give the helper its own model call and its own tools. Cap the size of the report. Log how much the helper read, so you can see a helper that reads too much.",
  cases: [
    { title: "NAIVE: the main agent reads everything", why: "The main agent searches by itself. Forty old drafts fill its space.", question: DOSE, flags: { hcp: "H-1", naive: "true" }, expect: "flooded" },
    { title: "A helper does the search", why: "The helper reads the drafts. The main agent keeps one short report.", question: DOSE, flags: { hcp: "H-1" }, expect: "clean" },
    { title: "A German doctor", why: "Dr. Weber is in Germany, so the report holds the German dose.", question: "What is the dose of Cardioza for Dr. Weber?", flags: { hcp: "H-2" }, expect: "clean" },
    { title: "EDGE: no approved document", why: "There is no approved document for Zorbex. The helper says so, and the main agent makes nothing up.", question: "What is the dose of Zorbex for Dr. Lee?", flags: { hcp: "H-1" }, expect: "no-answer" },
    { title: "EDGE: the helper makes up a dose", why: "The helper writes a dose that no approved document has. The main agent checks the report and refuses it.", question: DOSE, flags: { hcp: "H-1", model: "invent" }, expect: "no-answer" },
    { title: "EDGE: the helper gets stuck", why: "The helper never finishes. The main agent gets a short failure note, not the helper's whole log.", question: DOSE, flags: { hcp: "H-1", model: "stuck" }, expect: "no-answer" },
  ],
  play(question, flags) {
    const callLlm = modelFrom(flags);
    print(field("Question", question));
    const hcp = flags.hcp || "H-1";
    let done;
    if (flags.naive) done = answerAlone(question, hcp, callLlm);
    else done = answerWithHelper(question, hcp, callLlm);
    rule("LOG, STEP BY STEP");
    for (const line of done.log) console.log(dim(line));
    print(field("Answer", done.answer.slice(0, 120)));
    print(field("Main space", `${done.mainChars} characters (limit ${SPACE_LIMIT})`));
    if (done.mainChars > SPACE_LIMIT) {
      box(badgeRed("FLOODED"), [red("The main agent read the old drafts.")], red);
      return "flooded";
    }
    if (done.answer.startsWith("I found no")) {
      box(badgeGreen("NO ANSWER"), [green("Short space, and no made-up dose.")], green);
      return "no-answer";
    }
    box(badgeGreen("CLEAN"), [green("A short space and an approved answer.")], green);
    return "clean";
  },
};
