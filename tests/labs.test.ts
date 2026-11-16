import { describe, expect, test } from "bun:test";
import { APPROVED_DOCS } from "../src/data";
import { redactPhi, verifyOutput } from "../src/guardrails";
import { handleHcpInquiry } from "../src/inquiry";
import { runAgentLoop } from "../src/loop";
import { makeModel } from "../src/model";
import { hcpContextWorkflow, multiAgentPipeline, singleHcpAgent } from "../src/shapes";

const yes = () => "y";
const no = () => "n";
const silent = <T>(fn: () => T): T => {
  const log = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = log;
  }
};

describe("lab 1: agent loop", () => {
  test("searches then answers with a citation", () => {
    const r = runAgentLoop("What is the dose of Cardioza?", "US", makeModel());
    expect(r.steps.map((s) => s.kind)).toEqual(["tool", "answer"]);
    expect(r.answer).toContain("10mg");
    expect(r.answer).toContain("[DOC-101]");
  });
  test("uses the country's own document", () => {
    expect(runAgentLoop("Cardioza dose", "DE", makeModel()).answer).toContain("5mg");
  });
  test("stops at max steps", () => {
    const stuck = () => ({ toolCall: { name: "search_approved_docs", args: {} } });
    expect(runAgentLoop("x", "US", stuck, { maxSteps: 3 }).stopped).toBe(true);
  });
  test("refuses a tool that is not on the list", () => {
    const sneaky = () => ({ toolCall: { name: "get_hcp_profile", args: { hcpId: "H-1" } } });
    const r = runAgentLoop("x", "US", sneaky, { maxSteps: 1 });
    expect(r.steps[0].detail).toContain("TOOL_NOT_ALLOWED");
  });
});

describe("lab 2: guardrails", () => {
  test("masks ssn, phone, email, mrn and patient name", () => {
    const raw = "Patient: Jane Doe SSN 123-45-6789 call 555-123-4567 mail jane@x.com MRN 1234567";
    const { clean, found } = redactPhi(raw);
    expect(clean).toBe("Patient: [NAME] SSN [SSN] call [PHONE] mail [EMAIL] [MRN]");
    expect(found.length).toBe(5);
  });
  test("leaves a clean note alone", () => {
    expect(redactPhi("Cardioza dose").found).toEqual([]);
  });
  test("blocks a reply with no citation or an unknown one", () => {
    const ids = new Set(Object.keys(APPROVED_DOCS));
    expect(verifyOutput("10mg daily", ids).ok).toBe(false);
    expect(verifyOutput("10mg daily [DOC-999]", ids).ok).toBe(false);
    expect(verifyOutput("10mg daily [DOC-101]", ids).ok).toBe(true);
  });
});

describe("lab 3: gates", () => {
  test("approved question is sent with no gate", () => {
    const o = silent(() => handleHcpInquiry("Cardioza dose", "US", makeModel(), no));
    expect(o.status).toBe("SENT");
  });
  test("no approved document opens gate 1", () => {
    expect(silent(() => handleHcpInquiry("Zorbex dose", "US", makeModel(), yes)).status).toBe("SENT_AFTER_HUMAN_APPROVAL");
    expect(silent(() => handleHcpInquiry("Zorbex dose", "US", makeModel(), no)).status).toBe("BLOCKED_BY_REVIEWER");
  });
  test("a reply with no citation opens gate 2", () => {
    const o = silent(() => handleHcpInquiry("Cardioza dose", "US", makeModel("nocite"), no));
    expect(o.status).toBe("BLOCKED_BY_REVIEWER");
    expect(o.path).toContain("gate 2: output guardrail failed");
  });
  test("patient details never reach the model", () => {
    let seen = "";
    const spy = (m: { content: string }[]) => ((seen = m.map((x) => x.content).join(" ")), { text: "x [DOC-101]" });
    silent(() => handleHcpInquiry("Cardioza dose Patient: Jane Doe SSN 123-45-6789", "US", spy as never, no));
    expect(seen).not.toContain("123-45-6789");
    expect(seen).not.toContain("Jane");
  });
});

describe("lab 4: shapes", () => {
  test("workflow joins records with no model", () => {
    const r = hcpContextWorkflow("H-2");
    expect(r.profile.country).toBe("DE");
    expect(r.allowedDocs).toEqual(["DOC-102: Cardioza"]);
  });
  test("one agent picks three tools", () => {
    const r = singleHcpAgent("Cardioza dose", "H-1", makeModel());
    expect(r.steps.filter((s) => s.kind === "tool").length).toBe(3);
    expect(r.answer).toContain("Recent outreach");
  });
  test("auditor passes a true draft", () => {
    expect(silent(() => multiAgentPipeline("Cardioza dose", "US", makeModel(), no)).reply).toContain("10mg");
  });
  test("auditor catches a wrong dose that has a valid citation", () => {
    const draft = runAgentLoop("Cardioza dose", "US", makeModel("invent")).answer;
    expect(verifyOutput(draft, new Set(Object.keys(APPROVED_DOCS))).ok).toBe(true);
    const r = silent(() => multiAgentPipeline("Cardioza dose", "US", makeModel("invent"), no));
    expect(r.reply).toBe("REJECTED_BY_COMPLIANCE");
  });
});
