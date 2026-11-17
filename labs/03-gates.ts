// Lab 3: Human in the loop gates
//
// Dr. Lee asks: "What is the dose of Zorbex?" We have no approved document for Zorbex.
// A model would still write an answer. So we put a gate in the way. A gate stops the run
// and asks a person. Only a clear "yes" lets anything go out.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/03-gates.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/03-gates.ts --question "What is the dose of Cardioza?" --model nocite --naive
//   bun labs/03-gates.ts --question "What is the dose of Cardioza?"
//   bun labs/03-gates.ts --question "What is the dose of Zorbex?" --approve y
//   bun labs/03-gates.ts --question "What is the dose of Zorbex?" --approve n
//   bun labs/03-gates.ts --question "What is the dose of Cardioza?" --model nocite --approve y
//   bun labs/03-gates.ts --demo

import { APPROVED_DOCS, NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { showReview } from "../src/review";
import { runLab, type Ask } from "../src/runner";
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop"; // the loop and search from lab 1
import { labelsOf, redactPhi, verifyOutput } from "./02-guardrails"; // the guardrails from lab 2

export type Outcome = {
  status: string; // SENT, SENT_AFTER_HUMAN_APPROVAL, BLOCKED_BY_REVIEWER or SENT_UNCHECKED
  reply: string;
  log: string[]; // what happened, in order, so you can read the story
};

// Handle one question from a doctor. Read the steps in order. Two steps can stop the run at a gate.
export function handleHcpInquiry(
  question: string,
  country: string,
  callLlm: CallLlm,
  ask: Ask,
): Outcome {
  const log: string[] = [];

  // Step 1: hide the patient details (lab 2).
  const { clean, found } = redactPhi(question);
  log.push(`Step 1: hid ${found.length} private pieces ${labelsOf(found).join(", ")}.`);

  // Step 2: is there an approved document at all? If not, gate 1 stops the run before the model.
  if (searchApprovedDocs(clean, country) === NO_DOC) {
    log.push("Step 2: no approved document. Gate 1 stops the run. A person decides.");
    const draft = "Escalating to Medical Affairs: no approved label data for this query.";
    const approved = humanApprovalGate("No approved document", clean, draft, ask);
    return decide(approved, draft, log);
  }
  log.push("Step 2: an approved document exists. No gate yet.");

  // Step 3: the model answers, with the loop from lab 1.
  const { answer } = runAgentLoop(clean, country, callLlm);
  log.push(`Step 3: the model wrote: ${answer}`);

  // Step 4: check the reply (lab 2). If it fails, gate 2 stops the run. A person decides.
  const check = verifyOutput(answer, Object.keys(APPROVED_DOCS));
  if (!check.ok) {
    log.push(`Step 4: ${check.reason} Gate 2 stops the run. A person decides.`);
    const approved = humanApprovalGate(check.reason, clean, answer, ask);
    return decide(approved, answer, log);
  }

  // Step 5: nothing wrong, so the reply goes out.
  log.push("Step 4: the reply cites an approved document.\nStep 5: sent.");
  return { status: "SENT", reply: answer, log };
}

// The same job with no gate. Whatever the model writes goes out.
export function handleWithoutGate(question: string, country: string, callLlm: CallLlm): Outcome {
  const { answer } = runAgentLoop(question, country, callLlm);
  const log = [`Step 1: the model wrote: ${answer}`, "Step 2: no gate and no check. Sent."];
  return { status: "SENT_UNCHECKED", reply: answer, log };
}

// The gate. Show a person what they need, then ask yes or no.
// Only "y" means yes. Anything else, even no answer, means no. When unsure, do not send.
export function humanApprovalGate(
  reason: string,
  question: string,
  draft: string,
  ask: Ask,
): boolean {
  showReview(reason, question, draft);
  const answer = ask("Approve sending this response to the HCP? (y/n): ");
  if (answer === null) return false;
  return answer.trim().toLowerCase() === "y";
}

// After a gate: if the person said yes, send the draft. If not, send nothing.
function decide(approved: boolean, draft: string, log: string[]): Outcome {
  if (approved) {
    log.push("Step 5: the person approved. Sent.");
    return { status: "SENT_AFTER_HUMAN_APPROVAL", reply: draft, log };
  }
  log.push("Step 5: the person said no. Nothing was sent.");
  return { status: "BLOCKED_BY_REVIEWER", reply: "", log };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/03-gates");
  runLab(lab);
}
