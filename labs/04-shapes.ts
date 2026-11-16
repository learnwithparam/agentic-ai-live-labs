// Lab 4: Three ways to build one job
//
// The same job built three ways:
//   1. WORKFLOW:    plain code decides every step. No model.
//   2. ONE AGENT:   one model picks among several tools.
//   3. MULTI-AGENT: a researcher drafts, an auditor checks, a person decides on any doubt.
// The PART 2 section only prints the result in colour.
//
// Run it (copy any line):
//   bun labs/04-shapes.ts --question "(not used by a workflow)" --shape workflow --hcp H-2
//   bun labs/04-shapes.ts --question "(not used by a workflow)" --shape workflow --hcp H-9
//   bun labs/04-shapes.ts --question "Cardioza dose" --shape agent --hcp H-1
//   bun labs/04-shapes.ts --question "Cardioza dose" --shape agent --hcp H-2
//   bun labs/04-shapes.ts --demo

import { APPROVED_DOCS, CRM, EMAILS } from "../src/data";
import type { CallLlm, ToolInput } from "../src/model";
import { modelFrom, runLab, type Ask, type Flags, type Lab } from "../src/runner";
import { badgeBlue, badgeCyan, badgeMagenta, bold, box, cyan, dim, field, green } from "../src/ui";
import { highlight, print, red, rule, verdict, yellow } from "../src/ui";
import { runAgentLoop, searchApprovedDocs, type Tool } from "./01-agent-loop"; // loop and search from lab 1
import { humanApprovalGate } from "./03-gates"; // the gate from lab 3

// PART 1: THE CORE LOGIC

// SHAPE 1: WORKFLOW. Fixed steps in plain code. Same input, same output. No model.
export function hcpContextWorkflow(hcpId: string) {
  const profile = CRM[hcpId]; // this is undefined if we do not know the doctor
  let recentEmails: string[] = [];
  if (EMAILS[hcpId]) recentEmails = EMAILS[hcpId];

  const allowedDocs: string[] = [];
  for (const id in APPROVED_DOCS) {
    const doc = APPROVED_DOCS[id];
    if (profile && doc.country === profile.country) allowedDocs.push(`${id}: ${doc.drug}`);
  }
  return { profile, recentEmails, allowedDocs };
}

// The three tools for SHAPE 2. Each one takes the model's input and gives back text.
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

// SHAPE 2: ONE AGENT. The same loop as lab 1, but the model has three tools to choose from.
export function singleHcpAgent(question: string, hcpId: string, callLlm: CallLlm) {
  let country = "US";
  if (CRM[hcpId]) country = CRM[hcpId].country;
  return runAgentLoop(question, country, callLlm, threeTools, 5, hcpId);
}

// SHAPE 3: MULTI-AGENT. Two roles with one job each, and a person for any doubt.
export type Turn = { who: string; text: string };

export function multiAgentPipeline(question: string, country: string, callLlm: CallLlm, ask: Ask) {
  const trace: Turn[] = [];

  // Agent 1, the researcher, writes a draft with the loop from lab 1.
  const draft = runAgentLoop(question, country, callLlm).answer;
  trace.push({ who: "researcher", text: draft });

  // Agent 2 is the auditor. It checks that each sentence matches its document.
  const auditReply = callLlm([{ role: "user", content: `AUDIT: ${draft}` }], []);
  const verdictText = auditReply.text || "FAIL";
  trace.push({ who: "auditor", text: verdictText });
  const passed = verdictText.startsWith("PASS");
  if (passed) return { reply: draft, trace, passed };

  // The auditor has doubts, so a person decides. This is the gate from lab 3.
  const approved = humanApprovalGate(verdictText, question, draft, ask);
  if (approved) return { reply: draft, trace, passed };
  return { reply: "REJECTED_BY_COMPLIANCE", trace, passed };
}


// PART 2: HOW IT IS SHOWN (you can skip this)

const SHAPES: Record<string, string> = {
  workflow: "Plain code decides every step. The model is never called. Cheap, predictable, easy to test.",
  agent: "One model chooses among several tools and decides when it is done. Flexible, less predictable.",
  multi: "Two roles. A researcher drafts, an auditor checks every claim, and a person decides on any doubt.",
};

export const lab: Lab = {
  file: "04-shapes.ts",
  title: "Lab 4: workflow, one agent, multi-agent",
  about:
    "Three ways to build the same helper. Pick the shape with --shape workflow, agent or multi, and the doctor with --hcp H-1 (US), H-2 (Germany) or H-3 (US neurology).",
  cases: [
    { title: "Workflow: join a doctor's records", why: "No model needed to combine the CRM profile, recent emails and the documents this doctor's country allows.", question: "(not used by a workflow)", flags: { shape: "workflow", hcp: "H-2" }, expect: "joined" },
    { title: "Workflow: a doctor we do not know", why: "Plain code handles missing data the same way every time. No profile means no allowed documents.", question: "(not used by a workflow)", flags: { shape: "workflow", hcp: "H-9" }, expect: "joined" },
    { title: "One agent: three tools in turn", why: "The model looks up the profile, searches approved documents, then checks recent outreach before it answers.", question: "Cardioza dose", flags: { shape: "agent", hcp: "H-1" }, expect: "answered" },
    { title: "One agent: a doctor with no recent outreach", why: "Same agent, different doctor. Dr. Weber has no emails, and gets the German dose.", question: "Cardioza dose", flags: { shape: "agent", hcp: "H-2" }, expect: "answered" },
    { title: "One agent: no approved document", why: "The agent refuses to guess, but nothing double checks it. That is the gap multi-agent fills.", question: "Zorbex dose", flags: { shape: "agent", hcp: "H-3" }, expect: "no-source" },
    { title: "Multi-agent: auditor passes a true draft", why: "The researcher drafts. The auditor finds every cited sentence in its document word for word. No person is needed.", question: "Cardioza dose", flags: { shape: "multi", hcp: "H-1" }, expect: "passed" },
    { title: "Multi-agent: auditor catches a wrong dose", why: "The draft says 20mg and cites the real document, so lab 2's citation check passed it. The auditor compares the claim to the source and fails it. A person rejects it.", question: "Cardioza dose", flags: { shape: "multi", hcp: "H-1", model: "invent", approve: "n" }, expect: "rejected" },
    { title: "Multi-agent: a person overrides", why: "Same wrong draft, but the reviewer says yes. The gate is only as good as the person behind it.", question: "Cardioza dose", flags: { shape: "multi", hcp: "H-1", model: "invent", approve: "y" }, expect: "approved by person" },
    { title: "Multi-agent: nothing to audit", why: "The researcher finds no source, so the draft has no cited claim. The auditor fails it and a person decides.", question: "Zorbex dose", flags: { shape: "multi", hcp: "H-1", approve: "n" }, expect: "rejected" },
  ],
  play(question, flags, ask) {
    const shape = flags.shape || "agent";
    const hcpId = flags.hcp || "H-1";
    const doctor = CRM[hcpId];
    print(field("Shape", bold(shape), cyan));
    print(field("", SHAPES[shape] || "", dim));
    if (doctor) print(field("Doctor", `${hcpId} (${doctor.name}, ${doctor.country})`));
    else print(field("Doctor", `${hcpId} (unknown)`));
    console.log();

    if (!SHAPES[shape]) {
      box("ERROR", [red(`Unknown shape "${shape}". Use workflow, agent or multi.`)], red);
      return "error";
    }
    if (shape === "workflow") return showWorkflow(hcpId);
    if (!doctor) {
      box("ERROR", [red(`Unknown doctor ${hcpId}. Use one of: ${Object.keys(CRM).join(", ")}`)], red);
      return "error";
    }
    print(field("Question", question));
    if (shape === "agent") return showAgent(question, hcpId, flags);
    return showMultiAgent(question, doctor.country, flags, ask);
  },
};

function showWorkflow(hcpId: string): string {
  const result = hcpContextWorkflow(hcpId);
  console.log(`${badgeBlue("CODE")} ${bold("no model call")}`);
  if (!result.profile) {
    const lines = [red("No CRM profile for this doctor, so no documents are allowed.")];
    box("DOCTOR CONTEXT", lines, green);
    return "joined";
  }
  const { name, specialty, country } = result.profile;
  const emails = result.recentEmails.join("; ") || "none";
  const lines = [
    ...field("profile", `${name}, ${specialty}, ${country}`, cyan),
    ...field("emails", emails, cyan),
    ...field("allowed", result.allowedDocs.join(", ") || "none", cyan),
  ];
  box("DOCTOR CONTEXT", lines, green);
  return "joined";
}

function showAgent(question: string, hcpId: string, flags: Flags): string {
  const result = singleHcpAgent(question, hcpId, modelFrom(flags));
  for (const [index, step] of result.steps.entries()) {
    console.log();
    if (step.kind === "answer") {
      console.log(`${badgeCyan(`STEP ${index + 1}`)} ${bold("model answers")}`);
      continue;
    }
    console.log(`${badgeBlue(`STEP ${index + 1}`)} ${bold("tool")} ${cyan(step.tool)}`);
    print(field("  result", highlight(step.result), dim));
  }
  console.log();
  if (result.answer.includes("[DOC-")) {
    box("ANSWER", field("", highlight(result.answer), green, 0), green);
    return "answered";
  }
  box("NO APPROVED SOURCE", field("", highlight(result.answer), yellow, 0), yellow);
  return "no-source";
}

function showMultiAgent(question: string, country: string, flags: Flags, ask: Ask): string {
  const result = multiAgentPipeline(question, country, modelFrom(flags), ask);
  for (const turn of result.trace) {
    const badge = turn.who === "researcher" ? badgeBlue("RESEARCHER") : badgeMagenta("AUDITOR");
    console.log(`${badge} ${highlight(turn.text)}`);
  }
  rule();
  if (result.reply === "REJECTED_BY_COMPLIANCE") {
    box("REJECTED BY COMPLIANCE", [verdict.blocked("Nothing was sent.")], red);
    return "rejected";
  }
  const reply = field("", highlight(result.reply), green, 0);
  if (result.passed) {
    box("SENT", [...reply, verdict.safe("Auditor passed every claim.")], green);
    return "passed";
  }
  const warning = verdict.person("A wrong claim went out because the reviewer said yes.");
  box("SENT AFTER A PERSON OVERRODE THE AUDITOR", [...field("", highlight(result.reply), yellow, 0), warning], yellow);
  return "approved by person";
}

if (import.meta.main) runLab(lab);
