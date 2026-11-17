// What you see on screen for the shared memory lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/34-shared-memory.ts.
// Two bots ask in turn. The first one may use a model that makes up a dose. The second one is honest.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeModel } from "../src/model";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { answerShared, answerSharedNaive } from "../labs/34-shared-memory";

const DOSE = "What is the dose of Cardioza for Dr. Lee?";

export const lab: Lab = {
  file: "34-shared-memory.ts",
  title: "Memory the bots share",
  about:
    "Each example has two bots ask for a dose, one after the other. The bots save facts in shared memory. The first bot may use a model that makes up a dose, with --model invent. Pick the first doctor with --hcp and the second with --then.",
  terms: ["shared-memory", "poisoned", "provenance"],
  challenge: "One bot saves a wrong dose. Every bot after it reads the fact and repeats it. The shared memory is now poisoned.",
  promise: "A fact is saved only if it passes the dose check. Each fact keeps its provenance, which is the source it came from.",
  production: "Keep memory in a database with the writer and the source on every row. Let a person delete a poisoned fact, and log every read.",
  cases: [
    { title: "NAIVE: save whatever a bot says", why: "The first bot makes up a dose and it is saved. The second bot reads it and repeats it.", question: DOSE, flags: { hcp: "H-1", model: "invent", naive: "true" }, expect: "poisoned" },
    { title: "The second bot reuses a checked fact", why: "The first bot saves a checked dose. The second bot reads it from memory.", question: DOSE, flags: { hcp: "H-1" }, expect: "shared" },
    { title: "EDGE: a made-up dose is not saved", why: "The first bot makes up a dose. The check refuses to save it, so the second bot finds the real one.", question: DOSE, flags: { hcp: "H-1", model: "invent" }, expect: "clean" },
    { title: "EDGE: a fact for another country", why: "Dr. Lee is in the US and Dr. Weber is in Germany. The US fact is not used for Dr. Weber.", question: "What is the dose of Cardioza for Dr. Weber?", flags: { hcp: "H-1", then: "H-2" }, expect: "clean" },
    { title: "EDGE: no approved document", why: "There is no approved document for Zorbex. Nothing is saved, and the second bot says so too.", question: "What is the dose of Zorbex for Dr. Lee?", flags: { hcp: "H-1" }, expect: "no-answer" },
  ],
  play(question, flags) {
    const file = `${mkdtempSync(`${tmpdir()}/lab34-`)}/memory.jsonl`;
    const first = modelFrom(flags);
    const second = makeModel("ok");
    print(field("Question", question));
    const hcpA = flags.hcp || "H-1";
    const hcpB = flags.then || hcpA;
    const ask = flags.naive ? answerSharedNaive : answerShared;
    const one = ask(question, hcpA, first, { file, bot: "answer bot" });
    const two = ask(question, hcpB, second, { file, bot: "outreach bot" });
    rule("LOG, STEP BY STEP");
    console.log(dim(`First bot: from ${one.from}, saved: ${one.saved}. ${one.answer.slice(0, 70)}`));
    console.log(dim(`Second bot: from ${two.from}. ${two.answer.slice(0, 70)}`));
    print(field("Second answer", two.answer.slice(0, 110)));
    if (two.answer.includes("20mg")) {
      box(badgeRed("POISONED"), [red("The second bot repeated a made-up dose.")], red);
      return "poisoned";
    }
    if (!two.answer.includes("DOC-")) {
      box(badgeGreen("NO ANSWER"), [green("No approved source, so no dose.")], green);
      return "no-answer";
    }
    if (two.from === "memory") {
      box(badgeGreen("SHARED"), [green("The second bot reused a checked fact.")], green);
      return "shared";
    }
    box(badgeGreen("CLEAN"), [green("The second bot found the right dose itself.")], green);
    return "clean";
  },
};
