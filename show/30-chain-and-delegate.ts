// What you see on screen for the chains and delegation lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/30-chain-and-delegate.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { updateDoctors, updateNaive } from "../labs/30-chain-and-delegate";
import { APPROVED_DOCS, CRM } from "../src/data";

const ALL = "Write the Cardioza update for Dr. Lee, Dr. Weber and Dr. Rao.";

export const lab: Lab = {
  file: "30-chain-and-delegate.ts",
  title: "Chains and delegation",
  about:
    "Each example is one job for three doctors. Pick the doctors with --hcps, for example H-1,H-2,H-3. A lead splits the job and gives each doctor to a worker with a short chain.",
  terms: "chain = steps where each result feeds the next. delegate = hand a part of the job to a worker. lead = the one that splits the job and collects. worker = does one small part.",
  challenge: "One bot, one search and one letter for three doctors. The search ran for one country, so the others get the wrong label.",
  promise: "Each doctor's letter is written from a document of the doctor's own country, and it passes a check. A worker that fails is named and the others still go.",
  production: "Give each worker only what its part needs. Log each worker's result by name. Retry a failed worker once, then hand it to a person.",
  cases: [
    { title: "NAIVE: one letter for everyone", why: "One search runs for Dr. Lee's country. Dr. Weber gets the US dose in his letter.", question: ALL, flags: { naive: "true" }, expect: "wrong-label" },
    { title: "Three doctors, three chains", why: "Each worker searches its own doctor's country. Dr. Weber's letter cites the German document.", question: ALL, expect: "all-sent" },
    { title: "One doctor", why: "A job for one doctor is one worker and one chain.", question: "Write the Cardioza update for Dr. Weber please.", flags: { hcps: "H-2" }, expect: "all-sent" },
    { title: "EDGE: one worker has nothing to write from", why: "There is no German Neurovex document. Dr. Weber's worker holds its letter, and the other two still go.", question: "Write the Neurovex update for Dr. Lee, Dr. Weber and Dr. Rao.", expect: "partial" },
  ],
  play(question, flags) {
    const hcps = (flags.hcps || "H-1,H-2,H-3").split(",");
    print(field("Job", question));
    const model = modelFrom(flags);
    let letters;
    if (flags.naive) letters = updateNaive(question, hcps, model);
    else letters = updateDoctors(question, hcps, model);
    rule("LOG, STEP BY STEP");
    for (const letter of letters) for (const line of letter.log) console.log(dim(line));
    console.log();
    let wrong = 0;
    let held = 0;
    for (const letter of letters) {
      const name = CRM[letter.hcp].name;
      if (!letter.sent) held += 1;
      if (letter.sent && !ownDoc(letter.hcp, letter.text)) wrong += 1;
      if (letter.sent) print(field(name, letter.text.slice(0, 90)));
      else print(field(name, "held, no letter"));
    }
    if (wrong > 0) {
      box(badgeRed("WRONG LABEL"), [red(`${wrong} doctor got another country's label.`)], red);
      return "wrong-label";
    }
    if (held > 0) {
      box(badgeGreen("PARTIAL"), [green(`${held} held, the rest sent and correct.`)], green);
      return "partial";
    }
    box(badgeGreen("ALL SENT"), [green("Every letter cites its own country's document.")], green);
    return "all-sent";
  },
};

// Does the letter cite a document of the doctor's own country?
function ownDoc(hcp: string, text: string): boolean {
  for (const id of Object.keys(APPROVED_DOCS)) {
    if (text.includes(id) && APPROVED_DOCS[id].country === CRM[hcp].country) return true;
  }
  return false;
}
