// What you see on screen for the traces and audit lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/27-traces-and-audit.ts.

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { answerPlain, answerWithTrace, seal, verifyTrace } from "../labs/27-traces-and-audit";
import type { Entry } from "../labs/27-traces-and-audit";
import { readLines } from "../src/jobs";

const ASK = "What is the dose of Cardioza?";

export const lab: Lab = {
  file: "27-traces-and-audit.ts",
  title: "Traces and the audit ledger",
  about:
    "Each example answers Dr Weber, writes the trace, and then someone edits the file. Pick the edit with --tamper: edit, delete, cut or rewrite. Then we check the hash chain against the saved head.",
  terms: ["trace", "fingerprint", "hash-chain", "head"],
  challenge: "A month later someone asks why the bot said 5mg. A plain log can be edited to tell any story, and nobody can tell.",
  promise: "Every step is written down. Each line holds a fingerprint of the line before it. The chain is checked against the saved head, and it finds any edit.",
  production: "Send each line to storage that cannot be changed. Save the head in a second place with a different owner. Check the chain on a schedule.",
  cases: [
    { title: "NAIVE: a plain log", why: "Someone changes the document id in the log. The file still reads fine, and nothing notices.", question: ASK, flags: { hcp: "dr-weber", tamper: "edit", naive: "true" }, expect: "unnoticed" },
    { title: "Nobody touches the trace", why: "Every line is in order and every fingerprint matches.", question: ASK, flags: { hcp: "dr-weber" }, expect: "intact" },
    { title: "EDGE: one word is changed", why: "The document id in the result line is changed. The fingerprint of that line no longer matches.", question: ASK, flags: { hcp: "dr-weber", tamper: "edit" }, expect: "caught" },
    { title: "EDGE: a line is removed", why: "The search line is deleted. The next line points at a line that is gone.", question: ASK, flags: { hcp: "dr-weber", tamper: "delete" }, expect: "caught" },
    { title: "EDGE: the end is cut off", why: "The answer line is removed. The chain is still fine, but the last fingerprint is not the saved one.", question: ASK, flags: { hcp: "dr-weber", tamper: "cut" }, expect: "caught" },
    { title: "EDGE: the whole file is rewritten", why: "Someone edits a line and works every fingerprint out again. The chain is fine, but the head is not the saved one.", question: ASK, flags: { hcp: "dr-weber", tamper: "rewrite" }, expect: "caught" },
  ],
  play(question, flags) {
    const hcp = flags.hcp || "dr-weber";
    const file = `${mkdtempSync(`${tmpdir()}/lab27-`)}/trace.jsonl`;
    print(field("Question", question));
    const model = modelFrom(flags);
    if (flags.naive) return showPlain(question, hcp, model, file, flags.tamper || "");
    const traced = answerWithTrace(question, hcp, model, file);
    print(field("Answer", traced.answer));
    print(field("Saved head", traced.head.slice(0, 16)));
    tamper(file, flags.tamper || "");
    rule("LOG, STEP BY STEP");
    for (const line of readLines(file) as Entry[]) {
      console.log(dim(`${line.n}. ${line.kind}: ${line.detail.slice(0, 60)}  [${line.hash.slice(0, 8)}]`));
    }
    const checked = verifyTrace(file, traced.head);
    console.log();
    if (checked.ok) {
      box(badgeGreen("INTACT"), [green("Every line and the end match.")], green);
      return "intact";
    }
    box(badgeRed("CAUGHT"), [red(`Line ${checked.line}: ${checked.reason}.`)], red);
    return "caught";
  },
};

function showPlain(question: string, hcp: string, model: ReturnType<typeof modelFrom>, file: string, how: string): string {
  const answer = answerPlain(question, hcp, model, file);
  print(field("Answer", answer));
  tamper(file, how);
  rule("LOG, STEP BY STEP");
  for (const line of readLines(file)) console.log(dim(`${line.kind}: ${String(line.detail).slice(0, 60)}`));
  console.log();
  box(badgeRed("UNNOTICED"), [red("The log was edited. Every line still reads fine.")], red);
  return "unnoticed";
}

// Edit the file as a thief would. A rewrite also makes new fingerprints for every line.
function tamper(file: string, how: string): void {
  if (how === "") return;
  const lines = readFileSync(file, "utf8").split("\n").filter((line) => line.trim() !== "");
  if (how === "edit" || how === "rewrite") {
    lines[2] = lines[2].replace("CARDIOZA-DE", "CARDIOZA-US");
  }
  if (how === "delete") lines.splice(1, 1);
  if (how === "cut") lines.pop();
  if (how === "rewrite") resealAll(lines);
  writeFileSync(file, lines.join("\n") + "\n");
}

function resealAll(lines: string[]): void {
  let prev = "START";
  for (let i = 0; i < lines.length; i++) {
    const old = JSON.parse(lines[i]);
    if (old.prev === undefined) return; // a plain log has no fingerprints
    const fresh = seal(prev, i + 1, old.kind, old.detail);
    lines[i] = JSON.stringify(fresh);
    prev = fresh.hash;
  }
}
