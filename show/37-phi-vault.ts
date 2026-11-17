// What you see on screen for lab 37: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/37-phi-vault.ts.
// All the patients here are invented.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { readLines } from "../src/jobs";
import { findPrivate } from "../src/phi";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { recordCase, recordNaive } from "../labs/37-phi-vault";

const ONE = "Dr. Lee says Patient: Jane Doe (SSN 123-45-6789) takes Cardioza. What is the dose?";
const TWICE =
  "Dr. Lee says Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) takes Cardioza. Please confirm SSN 123-45-6789 and the dose.";

export const lab: Lab = {
  file: "37-phi-vault.ts",
  title: "Lab 37: private data in a vault",
  about:
    "Each example saves a case record for a doctor's note. Pick who looks at it with --role: reviewer or agent. The model never reads the real private data.",
  terms: "token = a stand-in such as [SSN-1]. vault = the place that keeps the real values. role = what a person is allowed to do. audit = a file that lists every try.",
  challenge: "A fixed mask hides the data from the model, but it also hides it from the reviewer. Nobody can get the value back.",
  promise: "The model sees tokens only. The same value has the same token. Only a reviewer sees real values, and every try is in the audit file.",
  production: "Keep the vault in an encrypted store with its own access list. Let your identity system say who is a reviewer. Never log the real values.",
  cases: [
    { title: "NAIVE: a fixed mask", why: "The reviewer opens the record. It says [SSN], and the real number is gone for good.", question: ONE, flags: { role: "reviewer", naive: "true" }, expect: "lost" },
    { title: "A reviewer opens the record", why: "The model read [SSN-1]. The reviewer sees the real number, and the audit file has one line.", question: ONE, flags: { role: "reviewer" }, expect: "revealed" },
    { title: "An agent opens the record", why: "An agent is not a reviewer. The record keeps its tokens, and the refused try is in the audit file.", question: ONE, flags: { role: "agent" }, expect: "hidden" },
    { title: "EDGE: the same number twice", why: "The SSN is in the note two times. Both get [SSN-1], and the phone gets its own token.", question: TWICE, flags: { role: "agent" }, expect: "hidden" },
  ],
  play(question, flags) {
    const dir = mkdtempSync(`${tmpdir()}/lab37-`);
    const llm = modelFrom(flags);
    const role = flags.role || "agent";
    print(field("Request", question));
    rule("LOG, STEP BY STEP");
    const result = flags.naive ? recordNaive(question, llm) : recordCase(question, { role, who: "Sam" }, llm, dir);
    console.log(dim(`Step 1 and 2: the model read: ${result.sentToModel}`));
    console.log(dim(`Step 3: role ${role}, ${result.revealed} token(s) turned back.`));
    for (const line of readLines(`${dir}/audit.jsonl`)) {
      console.log(dim(`Step 4: audit: ${line.who} as ${line.role}, ${line.allowed ? "allowed" : "refused"}.`));
    }
    console.log();
    print(field("Record", result.shown));
    return judge(question, result.shown, role);
  },
};

// Count the real values that show in the record. A reviewer should see all. Anyone else, none.
function judge(question: string, shown: string, role: string): string {
  let seen = 0;
  const pieces = findPrivate(question);
  for (const piece of pieces) if (shown.includes(piece.text)) seen += 1;
  if (role === "reviewer" && seen === pieces.length) {
    box(badgeGreen("REVEALED"), [green("The reviewer sees every real value.")], green);
    return "revealed";
  }
  if (role === "reviewer") {
    box(badgeRed("LOST"), [red("The real values cannot be got back.")], red);
    return "lost";
  }
  if (seen > 0) {
    box(badgeRed("LEAK"), [red("A real value shows to a role that may not see it.")], red);
    return "leak";
  }
  box(badgeGreen("HIDDEN"), [green("The record shows tokens only.")], green);
  return "hidden";
}
