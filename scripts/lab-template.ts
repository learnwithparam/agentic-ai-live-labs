// THE TITLE OF THE LAB
//
// Copy this file to labs/NN-your-name.ts (NN is the next number), then fill it in. `bun run check` tests it for you.
// Read PART 1. It is short, and it is the whole idea.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun run lab your-name --question "an example question"
//   bun run lab your-name --demo

import { modelFrom, runLab, type Lab } from "../src/runner";
import { box, field, green, print } from "../src/ui";

// PART 1: THE CORE LOGIC
// Write plain functions with whole-word names. Use for loops and if statements.

export function doTheJob(question: string): string {
  return `You asked: ${question}`;
}

// PART 2: HOW IT IS SHOWN (you can skip this)

export const lab: Lab = {
  file: "NN-your-name.ts",
  title: "Your title",
  about: "One or two short sentences about what this lab shows.",
  cases: [
    // Give each case a title, a plain reason, a question and the outcome word play() returns.
    // Add edge cases too: a missing thing, a wrong country, a spelling mistake.
    { title: "A normal question", why: "The happy path.", question: "hello", expect: "done" },
  ],
  play(question, flags) {
    modelFrom(flags); // the pretend model, if you need it
    print(field("Question", question));
    box("RESULT", field("", doTheJob(question), green, 0), green);
    return "done";
  },
};

if (import.meta.main) runLab(lab);
