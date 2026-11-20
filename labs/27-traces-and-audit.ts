// Traces and the audit ledger
//
// A month later, a compliance officer asks: "Why did the bot tell Dr. Weber the dose is 5mg?"
// We need the record of what happened: the question, the search, the document, the answer.
// A plain log file can be edited, and nobody can tell. So each line holds a fingerprint
// of the line before it. Change, move or remove one line, and every fingerprint after it breaks.
// We also save the last fingerprint somewhere else. Then a cut or a full rewrite shows too.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/27-traces-and-audit.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab traces-and-audit --question "What is the dose of Cardioza?" --hcp dr-weber --tamper edit --naive
//   bun run lab traces-and-audit --question "What is the dose of Cardioza?" --hcp dr-weber
//   bun run lab traces-and-audit --question "What is the dose of Cardioza?" --hcp dr-weber --tamper edit
//   bun run lab traces-and-audit --question "What is the dose of Cardioza?" --hcp dr-weber --tamper delete
//   bun run lab traces-and-audit --question "What is the dose of Cardioza?" --hcp dr-weber --tamper cut
//   bun run lab traces-and-audit --question "What is the dose of Cardioza?" --hcp dr-weber --tamper rewrite
//   bun run lab traces-and-audit --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { appendLine, readLines } from "../src/jobs"; // lines forced to disk
import { sha } from "../src/trace";
import { CRM } from "../src/data";
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop";
import type { Tool } from "./01-agent-loop";

export type Entry = { n: number; kind: string; detail: string; prev: string; hash: string };
export type Checked = { ok: boolean; line: number; reason: string };
export type Traced = { answer: string; head: string };
type Note = { (kind: string, detail: string): void };

// Seal one line. Its fingerprint covers the line before it, so no line can be moved or removed.
export function seal(prev: string, n: number, kind: string, detail: string): Entry {
  const hash = sha(`${prev}|${n}|${kind}|${detail}`);
  return { n, kind, detail, prev, hash };
}

function record(file: string, kind: string, detail: string): string {
  const lines: Entry[] = readLines(file);
  let prev = "START";
  if (lines.length > 0) prev = lines[lines.length - 1].hash;
  const entry = seal(prev, lines.length + 1, kind, detail);
  appendLine(file, entry);
  return entry.hash;
}

// Answer a doctor's question and write down each step. Read the steps in order.
function work(question: string, hcpId: string, callLlm: CallLlm, note: Note): string {
  const doctor = CRM[hcpId];
  // Step 1: write the question down first.
  note("question", `${hcpId} asked: ${question}`);
  const tool: Tool = {
    name: "search_approved_docs",
    run(input) {
      // Step 2: write each search and what it found.
      note("tool call", `search for "${input.query}" in ${doctor.country}`);
      const found = searchApprovedDocs(input.query, doctor.country);
      note("tool result", found);
      return found;
    },
  };
  const loop = runAgentLoop(question, doctor.country, callLlm, [tool], 5, hcpId);
  // Step 3: write the answer. Keep the last fingerprint, somewhere the editor cannot reach.
  note("answer", loop.answer);
  return loop.answer;
}

export function answerWithTrace(q: string, hcpId: string, callLlm: CallLlm, file: string): Traced {
  let head = "START";
  function note(kind: string, detail: string): void {
    head = record(file, kind, detail);
  }
  return { answer: work(q, hcpId, callLlm, note), head };
}

// Check the whole chain, line by line. The head is the last fingerprint we saved.
export function verifyTrace(file: string, head: string): Checked {
  const lines: Entry[] = readLines(file);
  let prev = "START";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Step 4: each line must point at the one before it, in order.
    if (line.n !== i + 1 || line.prev !== prev) {
      return { ok: false, line: i + 1, reason: "a line was removed or moved" };
    }
    // Step 5: work the fingerprint out again. A changed word gives a different one.
    if (seal(line.prev, line.n, line.kind, line.detail).hash !== line.hash) {
      return { ok: false, line: i + 1, reason: "the text of this line was changed" };
    }
    prev = line.hash;
  }
  // Step 6: the last fingerprint must be the one we saved. This finds a cut or a rewrite.
  if (prev !== head) return { ok: false, line: lines.length, reason: "the end does not match" };
  return { ok: true, line: 0, reason: "" };
}

// The naive way: plain lines with no fingerprints. Any edit looks fine.
export function answerPlain(q: string, hcpId: string, callLlm: CallLlm, file: string): string {
  function note(kind: string, detail: string): void {
    appendLine(file, { kind, detail });
  }
  return work(q, hcpId, callLlm, note);
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/27-traces-and-audit");
  runLab(lab);
}
