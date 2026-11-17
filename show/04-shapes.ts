// What you see on screen for the shapes lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/04-shapes.ts.

import { CRM } from "../src/data";
import { modelFrom, type Ask, type Flags, type Lab } from "../src/runner";
import { badgeBlue, badgeCyan, badgeMagenta, bold, box, cyan, dim, field, green } from "../src/ui";
import { highlight, print, red, rule, verdict, yellow } from "../src/ui";
import { hcpContextWorkflow, multiAgentPipeline, singleHcpAgent } from "../labs/04-shapes";

const SHAPES: Record<string, string> = {
  workflow: "Plain code decides every step. The model is never called. Cheap, predictable, easy to test.",
  agent: "One model chooses among several tools and decides when it is done. Flexible, less predictable.",
  multi: "Two roles. A researcher drafts, an auditor checks every claim, and a person decides on any doubt.",
};

export const lab: Lab = {
  file: "04-shapes.ts",
  title: "Three ways to build one job",
  about:
    "Three ways to build the same helper. A workflow runs fixed steps. One agent picks its own tools. Many agents pass work between them. Pick the shape with --shape workflow, agent or multi, and the doctor with --hcp H-1, H-2 or H-3.",
  terms: ["workflow", "agent", "many-agents", "auditor"],
  challenge: "One agent has no second pair of eyes. It can write a wrong dose and cite a real document, and nothing stops it. An auditor is a second model that checks the first one.",
  promise: "Pick the simplest shape that does the job. When a wrong answer is costly, an auditor checks it and a person decides on any doubt.",
  production: "Use a workflow when the steps never change. Add an agent only where the path must change. Add an auditor where a mistake would cost real money or safety.",
  cases: [
    { title: "NAIVE: one agent, and nothing checks it", why: "The model writes a wrong dose and cites the real document. One agent has no second pair of eyes, so the wrong dose goes out.", question: "What is the dose of Cardioza?", flags: { shape: "agent", hcp: "H-1", model: "invent" }, expect: "answered" },
    { title: "Workflow: join a doctor's records", why: "No model needed to combine the CRM profile, recent emails and the documents this doctor's country allows.", question: "What do we know about this doctor?", flags: { shape: "workflow", hcp: "H-2" }, expect: "joined" },
    { title: "Workflow: a doctor we do not know", why: "Plain code handles missing data the same way every time. No profile means no allowed documents.", question: "What do we know about this doctor?", flags: { shape: "workflow", hcp: "H-9" }, expect: "joined" },
    { title: "One agent: three tools in turn", why: "The model looks up the profile, searches approved documents, then checks recent outreach before it answers.", question: "What is the dose of Cardioza?", flags: { shape: "agent", hcp: "H-1" }, expect: "answered" },
    { title: "One agent: a doctor with no recent outreach", why: "Same agent, different doctor. Dr. Weber has no emails, and gets the German dose.", question: "What is the dose of Cardioza?", flags: { shape: "agent", hcp: "H-2" }, expect: "answered" },
    { title: "One agent: no approved document", why: "The agent refuses to guess, but nothing double checks it. That is the gap multi-agent fills.", question: "What is the dose of Zorbex?", flags: { shape: "agent", hcp: "H-3" }, expect: "no-source" },
    { title: "Multi-agent: auditor passes a true draft", why: "The researcher drafts. The auditor finds every cited sentence in its document word for word. No person is needed.", question: "What is the dose of Cardioza?", flags: { shape: "multi", hcp: "H-1" }, expect: "passed" },
    { title: "Multi-agent: auditor catches a wrong dose", why: "The draft says 20mg and cites the real document, so the guardrails lab's citation check passed it. The auditor compares the claim to the source and fails it. A person rejects it.", question: "What is the dose of Cardioza?", flags: { shape: "multi", hcp: "H-1", model: "invent", approve: "n" }, expect: "rejected" },
    { title: "Multi-agent: a person overrides", why: "Same wrong draft, but the reviewer says yes. The gate is only as good as the person behind it.", question: "What is the dose of Cardioza?", flags: { shape: "multi", hcp: "H-1", model: "invent", approve: "y" }, expect: "approved by person" },
    { title: "Multi-agent: nothing to audit", why: "The researcher finds no source, so the draft has no cited claim. The auditor fails it and a person decides.", question: "What is the dose of Zorbex?", flags: { shape: "multi", hcp: "H-1", approve: "n" }, expect: "rejected" },
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
  if (result.answer.includes("DOC-")) {
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
