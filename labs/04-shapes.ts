// Lab 4: Three ways to build one job
//
// Dr. Lee needs help with Cardioza. There are three ways to build the helper.
// A workflow is plain code with fixed steps. One agent is a model that picks its own tools.
// Many agents give each model one job, and a person decides when they doubt.
// Each shape trades control for flexibility. Pick the simplest shape that does the job.
// The examples and the screen output are in show/04-shapes.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape agent --hcp H-1 --model invent
//   bun labs/04-shapes.ts --question "What do we know about this doctor?" --shape workflow --hcp H-2
//   bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape agent --hcp H-1
//   bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape multi --model invent --approve n
//   bun labs/04-shapes.ts --demo

import { APPROVED_DOCS, CRM, EMAILS } from "../src/data";
import type { CallLlm, ToolInput } from "../src/model";
import { runLab, type Ask } from "../src/runner";
import { runAgentLoop, searchApprovedDocs, type Tool } from "./01-agent-loop"; // loop and search from lab 1
import { humanApprovalGate } from "./03-gates"; // the gate from lab 3

// Shape 1, a workflow. Fixed steps in plain code. Same input, same output. No model.
export function hcpContextWorkflow(hcpId: string) {
  // Step 1: look up the doctor. This is undefined if we do not know the doctor.
  const profile = CRM[hcpId];

  // Step 2: find the emails this doctor got recently.
  let recentEmails: string[] = [];
  if (EMAILS[hcpId]) recentEmails = EMAILS[hcpId];

  // Step 3: list the documents approved for this doctor's country.
  const allowedDocs: string[] = [];
  for (const id in APPROVED_DOCS) {
    const doc = APPROVED_DOCS[id];
    if (profile && doc.country === profile.country) allowedDocs.push(`${id}: ${doc.drug}`);
  }
  return { profile, recentEmails, allowedDocs };
}

// Shape 2, one agent. The same loop as lab 1, but the model has three tools to choose from.
export function singleHcpAgent(question: string, hcpId: string, callLlm: CallLlm) {
  // Step 1: find the doctor's country, so the search shows only approved documents.
  let country = "US";
  if (CRM[hcpId]) country = CRM[hcpId].country;

  // Step 2: run the loop. The model decides which tools to use, and in what order.
  return runAgentLoop(question, country, callLlm, threeTools, 5, hcpId);
}

// The three tools for shape 2. Each one takes the model's input and gives back text.
function profileTool(input: ToolInput): string {
  const doctor = CRM[input.hcpId];
  if (!doctor) return "Unknown HCP.";
  return `${doctor.name}, ${doctor.specialty}, ${doctor.country}`;
}

function searchTool(input: ToolInput): string {
  return searchApprovedDocs(input.query, input.country);
}

function outreachTool(input: ToolInput): string {
  const mails = EMAILS[input.hcpId];
  if (!mails || mails.length === 0) return "No recent outreach.";
  return `Recent outreach: ${mails.join("; ")}`;
}

const threeTools: Tool[] = [
  { name: "get_hcp_profile", run: profileTool },
  { name: "search_approved_docs", run: searchTool },
  { name: "check_recent_outreach", run: outreachTool },
];

// Shape 3, many agents. Two roles with one job each, and a person for any doubt.
export type Turn = { who: string; text: string };

export function multiAgentPipeline(question: string, country: string, callLlm: CallLlm, ask: Ask) {
  const trace: Turn[] = [];

  // Step 1: the researcher writes a draft, with the loop from lab 1.
  const draft = runAgentLoop(question, country, callLlm).answer;
  trace.push({ who: "researcher", text: draft });

  // Step 2: the auditor reads the draft next to the approved document, and checks each claim.
  const source = searchApprovedDocs(question, country);
  const rule = "Reply PASS if every claim matches the source. Otherwise reply FAIL and say why.";
  const prompt = `AUDIT: ${draft}\nSOURCE: ${source}\n${rule}`;
  const auditReply = callLlm([{ role: "user", content: prompt }], []);
  const verdictText = auditReply.text || "FAIL";
  trace.push({ who: "auditor", text: verdictText });
  const passed = verdictText.startsWith("PASS");

  // Step 3: if the auditor passes the draft, send it.
  if (passed) return { reply: draft, trace, passed };

  // Step 4: the auditor has doubts, so a person decides. This is the gate from lab 3.
  const approved = humanApprovalGate(verdictText, question, draft, ask);
  if (approved) return { reply: draft, trace, passed };
  return { reply: "REJECTED_BY_COMPLIANCE", trace, passed };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/04-shapes");
  runLab(lab);
}
