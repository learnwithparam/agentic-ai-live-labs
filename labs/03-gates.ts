// LAB 3: HUMAN IN THE LOOP GATES
//
// Read PART 1 (about 50 lines). A gate stops the run and asks a person.
//   GATE 1 fires before the model runs, when there is no approved document.
//   GATE 2 fires after the model runs, when the reply fails the output check.
// PART 2 only prints the result in colour, so you can skip it.
//
// Run it:   bun labs/03-gates.ts                          (menu of examples)
//           bun labs/03-gates.ts --demo                   (every edge case, with a reason for each)
//           bun labs/03-gates.ts --question "Zorbex dose" --approve n     (answer the gate for me)

import { APPROVED_DOCS, NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { modelFrom, runLab, type Ask, type Lab } from "../src/runner";
import { badgeYellow, box, dim, field, green, highlight, print, red, rule, verdict, yellow } from "../src/ui";
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop"; // the loop and search from lab 1
import { redactPhi, verifyOutput } from "./02-guardrails"; // the guardrails from lab 2

// ============================================================================
// PART 1: THE CORE LOGIC
// ============================================================================

// THE GATE. Show a person everything they need, ask yes or no, return true only for "y".
// Anything else, including no answer, counts as no. When unsure, do not send.
export function humanApprovalGate(reason: string, question: string, draft: string, ask: Ask): boolean {
  console.log();
  box(
    `${badgeYellow("GATE")} Human review required`,
    [...field("Reason", reason, yellow), ...field("Question", question), ...field("Draft", highlight(draft))],
    yellow,
  );
  const answer = ask("Approve sending this response to the HCP? (y/n): ");
  return (answer ?? "n").trim().toLowerCase() === "y";
}

export type Outcome = {
  status: "SENT" | "SENT_AFTER_HUMAN_APPROVAL" | "BLOCKED_BY_REVIEWER";
  reply: string;
  path: string[]; // what happened, in order, so you can read the story
};

// THE WHOLE PATH for one question from a doctor.
export function handleHcpInquiry(question: string, country: string, callLlm: CallLlm, ask: Ask): Outcome {
  const path: string[] = [];

  // Step 1: hide patient details (lab 2).
  const { clean, found } = redactPhi(question);
  path.push(found.length ? `redacted ${found.join(", ")}` : "nothing to redact");

  // Step 2: is there an approved document at all? If not, GATE 1 stops before the model runs.
  if (searchApprovedDocs(clean, country) === NO_DOC) {
    path.push("gate 1: no approved document for this question");
    const draft = "Escalating to Medical Affairs: no approved label data for this query.";
    const approved = humanApprovalGate("No approved document", clean, draft, ask);
    return approved
      ? { status: "SENT_AFTER_HUMAN_APPROVAL", reply: draft, path }
      : { status: "BLOCKED_BY_REVIEWER", reply: "", path };
  }

  // Step 3: run the agent loop (lab 1).
  const { answer } = runAgentLoop(clean, country, callLlm);
  path.push("agent loop answered");

  // Step 4: check the reply (lab 2). If it fails, GATE 2 stops it.
  const check = verifyOutput(answer, Object.keys(APPROVED_DOCS));
  if (!check.ok) {
    path.push("gate 2: output guardrail failed");
    const approved = humanApprovalGate(check.reason, clean, answer, ask);
    return approved
      ? { status: "SENT_AFTER_HUMAN_APPROVAL", reply: answer, path }
      : { status: "BLOCKED_BY_REVIEWER", reply: "", path };
  }

  path.push("output guardrail passed");
  return { status: "SENT", reply: answer, path };
}

// ============================================================================
// PART 2: HOW IT IS SHOWN (you can skip this)
// ============================================================================

export const lab3: Lab = {
  file: "03-gates.ts",
  title: "Lab 3: human in the loop gates",
  about:
    "A gate stops the run and hands the full trace to a person. Gate 1 fires before the model runs, when there is no approved document. Gate 2 fires after, when the reply fails the output check. Add --approve y or --approve n to answer a gate without typing.",
  cases: [
    { title: "No gate needed", why: "Approved document found, reply cited. Nothing to stop, so it is sent.", question: "Cardioza dose", expect: "SENT" },
    { title: "Gate 1, reviewer approves", why: "No approved document, so the model is never called. A person sees the fallback message and approves it.", question: "Zorbex dose", flags: { approve: "y" }, expect: "SENT_AFTER_HUMAN_APPROVAL" },
    { title: "Gate 1, reviewer rejects", why: "Same stop, but the person says no. Nothing is sent.", question: "Zorbex dose", flags: { approve: "n" }, expect: "BLOCKED_BY_REVIEWER" },
    { title: "Gate 2, reviewer approves", why: "The model forgot the citation. The output check stops it and a person reads the draft before it can go.", question: "Cardioza dose", flags: { model: "nocite", approve: "y" }, expect: "SENT_AFTER_HUMAN_APPROVAL" },
    { title: "Gate 2, reviewer rejects", why: "Same stop, and the person rejects it.", question: "Cardioza dose", flags: { model: "nocite", approve: "n" }, expect: "BLOCKED_BY_REVIEWER" },
    { title: "Patient details in the question", why: "The note is masked before the search, so the reply and the reviewer never see the SSN or the name.", question: "Cardioza dose for Patient: Jane Doe, SSN 123-45-6789", expect: "SENT" },
    { title: "Approved in another country only", why: "Dermalin is approved in the US only. A German doctor hits gate 1.", question: "Dermalin dose", flags: { country: "DE", approve: "n" }, expect: "BLOCKED_BY_REVIEWER" },
    { title: "Small talk", why: "No drug, no document. The safe default is to stop and ask a person.", question: "hello there", flags: { approve: "n" }, expect: "BLOCKED_BY_REVIEWER" },
  ],
  play(question, f, ask) {
    const country = f.country ?? "US";
    print(field("Question", question));
    print(field("Country", country));
    const outcome = handleHcpInquiry(question, country, modelFrom(f), ask);

    rule("PATH");
    for (const [i, step] of outcome.path.entries()) {
      const isGate = step.startsWith("gate");
      console.log(`  ${dim(`${i + 1}.`)} ${isGate ? yellow(`▲ ${step}`) : green(`✔ ${step}`)}`);
    }
    console.log();
    if (outcome.status === "SENT") box("SENT", field("", highlight(outcome.reply), green, 0), green);
    else if (outcome.status === "SENT_AFTER_HUMAN_APPROVAL") box("SENT AFTER A PERSON APPROVED", field("", highlight(outcome.reply), yellow, 0), yellow);
    else box("BLOCKED BY REVIEWER", [verdict.blocked("Nothing was sent to the doctor.")], red);
    return outcome.status;
  },
};

if (import.meta.main) runLab(lab3);
