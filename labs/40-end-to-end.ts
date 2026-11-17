// Lab 40: Put it all together
//
// Dr. Lee types a note that holds a patient's private details and asks for the Cardioza dose.
// One answer needs many of the ideas from the labs before this one. Each idea guards one risk.
// Hide the private details (lab 2). Never use a withdrawn document (lab 39).
// Check every sentence of the reply (lab 38). Ask a person when a check fails (lab 3).
// Write every step in a record that nobody can edit without it showing (lab 27).
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/40-end-to-end.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/40-end-to-end.ts --question "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789) on Cardioza dose" --naive
//   bun labs/40-end-to-end.ts --question "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789) on Cardioza dose"
//   bun labs/40-end-to-end.ts --question "What is the dose of Cardioza for Dr. Lee?" --model nocite --approve y
//   bun labs/40-end-to-end.ts --question "What is the dose of Cardioza for Dr. Lee?" --model nocite --approve n
//   bun labs/40-end-to-end.ts --question "What is the dose of Cardioza for Dr. Lee?" --withdraw DOC-101 --approve n
//   bun labs/40-end-to-end.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-9
//   bun labs/40-end-to-end.ts --demo

import { CRM } from "../src/data";
import { appendLine, readLines } from "../src/jobs"; // lines forced to disk
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import type { Ask } from "../src/runner";
import { runAgentLoop } from "./01-agent-loop"; // lab 1
import { redactPhi } from "./02-guardrails"; // lab 2
import { humanApprovalGate } from "./03-gates"; // lab 3
import { seal } from "./27-traces-and-audit"; // lab 27
import { checkClaims, type Row } from "./38-fact-checker"; // lab 38
import { answerChecked } from "./39-revocation"; // lab 39

export type Result = { status: string; reply: string; head: string; log: string[] };

// Answer one doctor's note, safely, from start to end. Read the steps in order.
export function answerEndToEnd(
  note: string,
  hcpId: string,
  callLlm: CallLlm,
  ask: Ask,
  dir: string,
): Result {
  const log: string[] = [];
  const file = `${dir}/record.jsonl`;
  let head = "START";
  function write(kind: string, detail: string): void {
    const entry = seal(head, readLines(file).length + 1, kind, detail);
    appendLine(file, entry);
    head = entry.hash;
  }
  function stop(status: string, why: string): Result {
    log.push(why);
    return { status, reply: "", head, log };
  }

  // Step 1: know who is asking. An unknown doctor gets nothing.
  const doctor = CRM[hcpId];
  if (!doctor) return stop("refused", "Step 1: we do not know this doctor. Nothing is sent.");
  log.push(`Step 1: the doctor is ${doctor.name}, in ${doctor.country}.`);
  write("asked", `${hcpId} asked a question`);

  // Step 2: hide the private details. Only the clean note goes on.
  const { clean, found } = redactPhi(note);
  log.push(`Step 2: hid ${found.length} private pieces. The model reads: ${clean}`);
  write("hid", `${found.length} private pieces`);

  // Step 3: answer from approved documents only, and never from a withdrawn one.
  const answered = answerChecked(clean, doctor.country, callLlm, dir);
  for (const line of answered.log) log.push(line);
  log.push(`Step 3: the model wrote: ${answered.answer}`);
  write("answered", answered.answer);

  // Step 4: check each sentence of the reply against the approved documents.
  const checked = checkClaims(answered.answer, doctor.country);
  if (checked.sent) log.push("Step 4: every sentence matches an approved document.");
  if (checked.sent) write("checked", "every sentence passed");
  if (checked.sent) return { status: "sent", reply: answered.answer, head, log };

  // Step 5: a check failed. A person decides. Anything but a clear yes means no.
  const why = firstFailure(checked.rows);
  log.push(`Step 4: a sentence failed: ${why}.`);
  const approved = humanApprovalGate(why, clean, answered.answer, ask);
  if (approved) write("person", "approved");
  if (!approved) write("person", "refused");
  if (approved) return { status: "sent-after-approval", reply: answered.answer, head, log };
  return stop("blocked", "Step 5: the person said no. Nothing is sent.");
}

// The reason the first bad sentence failed.
function firstFailure(rows: Row[]): string {
  for (const row of rows) if (!row.ok) return row.why;
  return "a check failed";
}

// The same job with none of the guards. The model reads the raw note, and the reply goes out.
export function answerNaive(note: string, hcpId: string, callLlm: CallLlm): Result {
  let country = "US";
  if (CRM[hcpId]) country = CRM[hcpId].country;
  const reply = runAgentLoop(note, country, callLlm).answer;
  return { status: "sent-unchecked", reply, head: "START", log: ["Step 1: sent, with no guard."] };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/40-end-to-end");
  runLab(lab);
}
