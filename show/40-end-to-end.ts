// What you see on screen for the end-to-end lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/40-end-to-end.ts.
// Each example sends one note through every guard. The record of the run is checked at the end.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { verifyTrace } from "../labs/27-traces-and-audit";
import { withdraw } from "../labs/39-revocation";
import { answerEndToEnd, answerNaive, type Result } from "../labs/40-end-to-end";

const NOTE = "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789) on Cardioza dose";
const DOSE = "What is the dose of Cardioza for Dr. Lee?";

export const lab: Lab = {
  file: "40-end-to-end.ts",
  title: "Put it all together",
  about:
    "Each example sends one doctor's note through every guard from the labs before. Use --hcp to pick the doctor. Use --withdraw to withdraw a document first. Use --approve y or n to answer the person's gate.",
  terms: "guard = one check that stops one risk. record = the log of every step, linked so an edit shows. gate = a stop where a person decides.",
  challenge: "Each guard works alone. One missing guard is still a hole. A note can leak a patient. A withdrawn dose can go out. The other guards cannot help.",
  promise: "Private details never reach the model. Only a checked reply goes out, or one a person approved. Every step is in a record that shows any edit.",
  production: "Run each guard as its own service with its own owner. Alert a person when a guard blocks, and keep the record in storage that cannot be changed.",
  cases: [
    { title: "NAIVE: no guards", why: "The model reads the patient's name and number, and its reply goes out with no check.", question: NOTE, flags: { naive: "true" }, expect: "sent-unchecked" },
    { title: "Every guard passes", why: "The private details are hidden, the reply matches DOC-101, and the record is whole.", question: NOTE, flags: {}, expect: "sent" },
    { title: "EDGE: a reply with no source, and a person says yes", why: "The model forgets the citation, so the check fails. The person reads it and approves.", question: DOSE, flags: { model: "nocite", approve: "y" }, expect: "sent-after-approval" },
    { title: "EDGE: a reply with no source, and a person says no", why: "The same failure, and the person says no. Nothing is sent.", question: DOSE, flags: { model: "nocite", approve: "n" }, expect: "blocked" },
    { title: "EDGE: the document was withdrawn", why: "DOC-101 is withdrawn, and no other approved document is left. The bot says it has no approved source. That is true, so it goes out. The old dose never does.", question: DOSE, flags: { withdraw: "DOC-101" }, expect: "sent" },
    { title: "EDGE: a doctor we do not know", why: "H-9 is not in the CRM, so the run stops at step 1.", question: DOSE, flags: { hcp: "H-9" }, expect: "refused" },
  ],
  play(question, flags, ask) {
    const dir = mkdtempSync(`${tmpdir()}/lab40-`);
    const llm = modelFrom(flags);
    const hcp = flags.hcp || "H-1";
    print(field("Question", question));
    if (flags.withdraw) withdraw(dir, flags.withdraw, "The label changed.");
    rule("LOG, STEP BY STEP");
    if (flags.naive) return judgeNaive(answerNaive(question, hcp, llm));
    const result = answerEndToEnd(question, hcp, llm, ask, dir);
    for (const line of result.log) console.log(dim(line));
    console.log();
    return judge(result, verifyTrace(`${dir}/record.jsonl`, result.head).ok);
  },
};

function judgeNaive(result: Result): string {
  print(field("Reply", result.reply));
  box(badgeRed("NO GUARD"), [red("The model read the raw note, and the reply went out unchecked.")], red);
  return result.status;
}

function judge(result: Result, recordOk: boolean): string {
  if (result.reply !== "") print(field("Reply", result.reply));
  const tag = result.status.toUpperCase();
  if (result.status === "sent" || result.status === "sent-after-approval") {
    box(badgeGreen(tag), [green(`Record is whole: ${recordOk}.`)], green);
  } else {
    box(badgeRed(tag), [red("Nothing was sent.")], red);
  }
  return result.status;
}
