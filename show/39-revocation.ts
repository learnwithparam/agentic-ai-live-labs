// What you see on screen for the revocation lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/39-revocation.ts.
// Each example first asks once, so the answer is saved. Then a document is withdrawn, and the same question comes again.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { answerChecked, answerNaive, withdraw, withdrawnIds, type Answered } from "../labs/39-revocation";

const ASK = "What is the dose of Cardioza for Dr. Lee?";

export const lab: Lab = {
  file: "39-revocation.ts",
  title: "Withdrawn documents and the cache",
  about:
    "Each example asks one question twice. In between, a document may be withdrawn. Use --withdraw to withdraw it after the first answer. Use --late to withdraw it while the second answer is made.",
  terms: "withdrawn = the company took the document back. cache = saved answers, so the next ask is fast. revoke = make a saved answer stop working.",
  challenge: "A saved answer is fast, and it never looks at the document again. When the document is withdrawn, the old dose still goes out.",
  promise: "A withdrawn document is never sent. That holds for a saved answer, and for an answer made a moment before. A US answer never reaches a German doctor.",
  production: "Keep the withdrawal list in the same store as the documents, and have the document system call it. Alert the medical team when a saved answer is dropped.",
  cases: [
    { title: "NAIVE: serve the saved answer", why: "DOC-101 is withdrawn after the first answer. The saved answer still holds its dose, and it goes out again.", question: ASK, flags: { withdraw: "DOC-101", naive: "true" }, expect: "stale" },
    { title: "A withdrawn document", why: "The saved answer cites DOC-101. It is deleted. Nothing else is approved for Cardioza in the US, so there is no answer.", question: ASK, flags: { withdraw: "DOC-101" }, expect: "no-answer" },
    { title: "Another country's document", why: "DOC-102 is for Germany. It is withdrawn, but Dr. Lee is in the US, so the saved answer is still good.", question: ASK, flags: { withdraw: "DOC-102" }, expect: "cache" },
    { title: "Nothing withdrawn", why: "The second ask is served from the saved answer. It is fast, and it is still approved.", question: ASK, flags: {}, expect: "cache" },
    { title: "EDGE: withdrawn during the run", why: "There is no saved answer. The document is withdrawn after the search and before the send. The last check catches it.", question: ASK, flags: { late: "DOC-101" }, expect: "blocked" },
  ],
  play(question, flags) {
    const dir = mkdtempSync(`${tmpdir()}/lab39-`);
    const llm = modelFrom(flags);
    const country = flags.country || "US";
    print(field("Question", question));
    rule("LOG, STEP BY STEP");
    if (!flags.late) {
      const first = flags.naive ? answerNaive(question, country, llm, dir) : answerChecked(question, country, llm, dir);
      console.log(dim(`First ask: ${first.source}. ${first.answer}`));
    }
    if (flags.withdraw) withdraw(dir, flags.withdraw, "The label changed.");
    if (flags.withdraw) console.log(dim(`${flags.withdraw} is withdrawn.`));
    const hook = flags.late ? () => withdraw(dir, flags.late, "The label changed.") : undefined;
    const second = flags.naive ? answerNaive(question, country, llm, dir) : answerChecked(question, country, llm, dir, hook);
    for (const line of second.log) console.log(dim(line));
    console.log(dim(`Second ask: ${second.source}.`));
    console.log();
    print(field("Answer", second.answer));
    return judge(second, withdrawnIds(dir));
  },
};

// A withdrawn id in the answer is the failure. Anything else is a good result.
function judge(result: Answered, withdrawn: string[]): string {
  for (const id of withdrawn) {
    if (result.answer.includes(`[${id}]`)) {
      box(badgeRed("WITHDRAWN DOSE SENT"), [red(`The answer cites ${id}, which was withdrawn.`)], red);
      return "stale";
    }
  }
  if (result.source === "none") {
    box(badgeGreen("NO ANSWER"), [green("No approved document is left, so the bot says nothing.")], green);
    return "no-answer";
  }
  box(badgeGreen(result.source.toUpperCase()), [green("The answer is still approved.")], green);
  return result.source;
}
