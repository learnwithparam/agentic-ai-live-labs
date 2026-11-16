import { APPROVED_DOCS } from "./data";
import { humanApprovalGate, type Ask } from "./gate";
import { verifyOutput, redactPhi } from "./guardrails";
import { runAgentLoop } from "./loop";
import type { CallLlm } from "./model";
import { NO_DOC, searchApprovedDocs } from "./tools";

export type Outcome = { status: "SENT" | "SENT_AFTER_HUMAN_APPROVAL" | "BLOCKED_BY_REVIEWER"; reply: string; path: string[] };

// The whole path for one question: redact, search, loop, check, gate.
export function handleHcpInquiry(question: string, country: string, callLlm: CallLlm, ask: Ask): Outcome {
  const path: string[] = [];
  const { clean, found } = redactPhi(question);
  path.push(found.length ? `redacted ${found.join(", ")}` : "nothing to redact");

  const docs = searchApprovedDocs(clean, country);
  if (docs === NO_DOC) {
    path.push("gate 1: no approved document for this question");
    const draft = "Escalating to Medical Affairs: no approved label data for this query.";
    const approved = humanApprovalGate({ reason: "Off-label or unapproved topic", question: clean, sources: docs, draft }, ask);
    return approved
      ? { status: "SENT_AFTER_HUMAN_APPROVAL", reply: draft, path }
      : { status: "BLOCKED_BY_REVIEWER", reply: "", path };
  }

  const { answer } = runAgentLoop(clean, country, callLlm);
  path.push("agent loop answered");
  const verdict = verifyOutput(answer, new Set(Object.keys(APPROVED_DOCS)));
  if (!verdict.ok) {
    path.push("gate 2: output guardrail failed");
    const approved = humanApprovalGate({ reason: verdict.reason, question: clean, sources: docs, draft: answer }, ask);
    return approved
      ? { status: "SENT_AFTER_HUMAN_APPROVAL", reply: answer, path }
      : { status: "BLOCKED_BY_REVIEWER", reply: "", path };
  }
  path.push("output guardrail passed");
  return { status: "SENT", reply: verdict.reply, path };
}
