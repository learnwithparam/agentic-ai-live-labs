import { APPROVED_DOCS, CRM, EMAILS } from "./data";
import { humanApprovalGate, type Ask } from "./gate";
import { runAgentLoop } from "./loop";
import type { CallLlm } from "./model";

// SHAPE 1: WORKFLOW. Plain code decides every step. No model is called.
export function hcpContextWorkflow(hcpId: string) {
  const profile = CRM[hcpId];
  const recentEmails = EMAILS[hcpId] ?? [];
  const allowedDocs = Object.entries(APPROVED_DOCS)
    .filter(([, d]) => d.country === profile?.country)
    .map(([id, d]) => `${id}: ${d.drug}`);
  return { profile, recentEmails, allowedDocs };
}

// SHAPE 2: ONE AGENT. One model chooses among several tools.
export function singleHcpAgent(question: string, hcpId: string, callLlm: CallLlm) {
  const country = CRM[hcpId]?.country ?? "US";
  return runAgentLoop(question, country, callLlm, {
    hcpId,
    toolNames: ["get_hcp_profile", "search_approved_docs", "check_recent_outreach"],
  });
}

// SHAPE 3: MULTI-AGENT. Two roles hand a draft to each other, and a person decides on any doubt.
export function multiAgentPipeline(question: string, country: string, callLlm: CallLlm, ask: Ask) {
  const trace: string[] = [];
  const draft = runAgentLoop(question, country, callLlm).answer;
  trace.push(`researcher drafted: ${draft}`);

  const verdict = callLlm([{ role: "user", content: `AUDIT: ${draft}` }], []).text ?? "FAIL";
  trace.push(`auditor said: ${verdict}`);

  if (!verdict.startsWith("PASS")) {
    const approved = humanApprovalGate(
      { reason: verdict, question, sources: JSON.stringify(Object.keys(APPROVED_DOCS)), draft },
      ask,
    );
    return { reply: approved ? draft : "REJECTED_BY_COMPLIANCE", trace };
  }
  return { reply: draft, trace };
}
