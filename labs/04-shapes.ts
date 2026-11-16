// LAB 4: WORKFLOW, ONE AGENT, MULTI-AGENT
//
// Read PART 1 (about 60 lines). The same job built three ways:
//   1. WORKFLOW:    plain code decides every step. No model.
//   2. ONE AGENT:   one model picks among several tools.
//   3. MULTI-AGENT: a researcher drafts, an auditor checks, a person decides on any doubt.
// PART 2 only prints the result in colour, so you can skip it.
//
// Run it:   bun labs/04-shapes.ts                              (menu of examples)
//           bun labs/04-shapes.ts --demo                       (every edge case, with a reason for each)
//           bun labs/04-shapes.ts --question "Cardioza dose" --shape multi --hcp H-1

import { APPROVED_DOCS, CRM, EMAILS } from "../src/data";
import type { CallLlm } from "../src/model";
import { modelFrom, runLab, type Ask, type Lab } from "../src/runner";
import { badgeBlue, badgeCyan, badgeMagenta, bold, box, cyan, dim, field, green, highlight, print, red, rule, verdict, yellow } from "../src/ui";
import { runAgentLoop, searchApprovedDocs, type Tool } from "./01-agent-loop"; // the loop and search from lab 1
import { humanApprovalGate } from "./03-gates"; // the gate from lab 3

// ============================================================================
// PART 1: THE CORE LOGIC
// ============================================================================

// SHAPE 1: WORKFLOW. Fixed steps in plain code. Same input, same output, every time. No model.
export function hcpContextWorkflow(hcpId: string) {
  const profile = CRM[hcpId]; // undefined if we do not know this doctor
  const recentEmails = EMAILS[hcpId] ?? [];
  const allowedDocs: string[] = [];
  for (const [id, doc] of Object.entries(APPROVED_DOCS)) {
    if (profile && doc.country === profile.country) allowedDocs.push(`${id}: ${doc.drug}`);
  }
  return { profile, recentEmails, allowedDocs };
}

// SHAPE 2: ONE AGENT. Same loop as lab 1, but the model now has three tools to choose from.
export function singleHcpAgent(question: string, hcpId: string, callLlm: CallLlm) {
  const tools: Record<string, Tool> = {
    get_hcp_profile: (args) => {
      const p = CRM[args.hcpId];
      return p ? `${p.name}, ${p.specialty}, ${p.country}` : "Unknown HCP.";
    },
    search_approved_docs: (args) => searchApprovedDocs(args.query, args.country),
    check_recent_outreach: (args) => {
      const mails = EMAILS[args.hcpId] ?? [];
      return mails.length > 0 ? `Recent outreach: ${mails.join("; ")}` : "No recent outreach.";
    },
  };
  const country = CRM[hcpId]?.country ?? "US";
  return runAgentLoop(question, country, callLlm, { tools, hcpId });
}

// SHAPE 3: MULTI-AGENT. Two roles, each with one job, plus a person for any doubt.
export type Turn = { who: "researcher" | "auditor"; text: string };

export function multiAgentPipeline(question: string, country: string, callLlm: CallLlm, ask: Ask) {
  const trace: Turn[] = [];

  // Agent 1, the researcher: write a draft using the loop from lab 1.
  const draft = runAgentLoop(question, country, callLlm).answer;
  trace.push({ who: "researcher", text: draft });

  // Agent 2, the auditor: check that every cited sentence matches its document word for word.
  const verdictText = callLlm([{ role: "user", content: `AUDIT: ${draft}` }], []).text ?? "FAIL";
  trace.push({ who: "auditor", text: verdictText });
  const passed = verdictText.startsWith("PASS");
  if (passed) return { reply: draft, trace, passed, approvedByPerson: false };

  // The auditor has doubts, so a person decides (the gate from lab 3).
  const approved = humanApprovalGate(verdictText, question, draft, ask);
  return { reply: approved ? draft : "REJECTED_BY_COMPLIANCE", trace, passed, approvedByPerson: approved };
}

// ============================================================================
// PART 2: HOW IT IS SHOWN (you can skip this)
// ============================================================================

const SHAPES: Record<string, string> = {
  workflow: "Plain code decides every step. The model is never called. Cheap, predictable, easy to test.",
  agent: "One model chooses among several tools and decides when it is done. Flexible, less predictable.",
  multi: "Two roles. A researcher drafts, an auditor checks every claim, and a person decides on any doubt.",
};

export const lab4: Lab = {
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
  play(question, f, ask) {
    const shape = f.shape ?? "agent";
    const hcpId = f.hcp ?? "H-1";
    const doctor = CRM[hcpId];
    print(field("Shape", bold(shape), cyan));
    print(field("", SHAPES[shape] ?? "", dim));
    print(field("Doctor", `${hcpId} ${doctor ? `(${doctor.name}, ${doctor.country})` : "(unknown)"}`));
    console.log();

    if (!SHAPES[shape]) {
      box("ERROR", [red(`Unknown shape "${shape}". Use workflow, agent or multi.`)], red);
      return "error";
    }
    if (shape === "workflow") {
      const r = hcpContextWorkflow(hcpId);
      console.log(`${badgeBlue("CODE")} ${bold("no model call")}`);
      const lines = r.profile
        ? [...field("profile", `${r.profile.name}, ${r.profile.specialty}, ${r.profile.country}`, cyan), ...field("emails", r.recentEmails.length ? r.recentEmails.join("; ") : "none", cyan), ...field("allowed", r.allowedDocs.join(", ") || "none", cyan)]
        : [red("No CRM profile for this doctor, so no documents are allowed."), ...field("emails", "none", cyan)];
      box("DOCTOR CONTEXT", lines, green);
      return "joined";
    }
    if (!doctor) {
      box("ERROR", [red(`Unknown doctor ${hcpId}. Use one of: ${Object.keys(CRM).join(", ")}`)], red);
      return "error";
    }
    print(field("Question", question));

    if (shape === "agent") {
      const r = singleHcpAgent(question, hcpId, modelFrom(f));
      for (const [i, s] of r.steps.entries()) {
        console.log();
        if (s.kind === "tool") {
          console.log(`${badgeBlue(`STEP ${i + 1}`)} ${bold("tool")} ${cyan(s.tool)}`);
          print(field("  result", highlight(s.result), dim));
        } else console.log(`${badgeCyan(`STEP ${i + 1}`)} ${bold("model answers")}`);
      }
      console.log();
      const cited = r.answer.includes("[DOC-");
      box(cited ? "ANSWER" : "NO APPROVED SOURCE", field("", highlight(r.answer), cited ? green : yellow, 0), cited ? green : yellow);
      return cited ? "answered" : "no-source";
    }

    const r = multiAgentPipeline(question, doctor.country, modelFrom(f), ask);
    for (const t of r.trace) console.log(`${t.who === "researcher" ? badgeBlue("RESEARCHER") : badgeMagenta("AUDITOR")} ${highlight(t.text)}`);
    rule();
    if (r.reply === "REJECTED_BY_COMPLIANCE") box("REJECTED BY COMPLIANCE", [verdict.blocked("Nothing was sent.")], red);
    else if (r.passed) box("SENT", [...field("", highlight(r.reply), green, 0), verdict.safe("Auditor passed every claim.")], green);
    else box("SENT AFTER A PERSON OVERRODE THE AUDITOR", [...field("", highlight(r.reply), yellow, 0), verdict.person("A wrong claim went out because the reviewer said yes.")], yellow);
    return r.reply === "REJECTED_BY_COMPLIANCE" ? "rejected" : r.passed ? "passed" : "approved by person";
  },
};

if (import.meta.main) runLab(lab4);
