import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { APPROVED_DOCS } from "../src/data";
import { makeModel } from "../src/model";
import { checkCases, type Lab } from "../src/runner";
import { searchOnly, runAgentLoop } from "../labs/01-agent-loop";
import { redactPhi, verifyOutput } from "../labs/02-guardrails";
import { handleHcpInquiry, handleWithoutGate } from "../labs/03-gates";
import { hcpContextWorkflow, multiAgentPipeline, singleHcpAgent } from "../labs/04-shapes";
import { problemsIn } from "../scripts/readable";

const yes = () => "y";
const no = () => "n";
const ids = Object.keys(APPROVED_DOCS);

// Labs print to the terminal. Tests keep that quiet.
function silent<T>(work: () => T): T {
  const log = console.log;
  console.log = () => {};
  try {
    return work();
  } finally {
    console.log = log;
  }
}

describe("lab 1: agent loop", () => {
  test("searches then answers with a citation", () => {
    const result = runAgentLoop("What is the dose of Cardioza?", "US", makeModel());
    expect(result.steps.map((step) => step.kind)).toEqual(["tool", "answer"]);
    expect(result.answer).toContain("10mg");
    expect(result.answer).toContain("[DOC-101]");
  });
  test("uses the country's own document", () => {
    expect(runAgentLoop("Cardioza dose", "DE", makeModel()).answer).toContain("5mg");
  });
  test("stops at max steps", () => {
    const stuck = () => ({ toolCall: { name: "search_approved_docs", args: { query: "x", country: "US", hcpId: "none" } } });
    expect(runAgentLoop("x", "US", stuck, searchOnly, 3).stopped).toBe(true);
  });
  test("refuses a tool that is not on the list", () => {
    const sneaky = () => ({ toolCall: { name: "get_hcp_profile", args: { query: "x", country: "US", hcpId: "H-1" } } });
    const result = runAgentLoop("x", "US", sneaky, searchOnly, 1);
    expect(result.steps[0]).toMatchObject({ kind: "tool", result: "TOOL_NOT_ALLOWED: get_hcp_profile" });
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
    expect(verifyOutput("10mg daily", ids).ok).toBe(false);
    expect(verifyOutput("10mg daily [DOC-999]", ids).ok).toBe(false);
    expect(verifyOutput("10mg daily [DOC-101]", ids).ok).toBe(true);
  });
});

describe("lab 3: gates", () => {
  test("approved question is sent with no gate", () => {
    expect(silent(() => handleHcpInquiry("Cardioza dose", "US", makeModel(), no)).status).toBe("SENT");
  });
  test("no approved document opens gate 1", () => {
    expect(silent(() => handleHcpInquiry("Zorbex dose", "US", makeModel(), yes)).status).toBe("SENT_AFTER_HUMAN_APPROVAL");
    expect(silent(() => handleHcpInquiry("Zorbex dose", "US", makeModel(), no)).status).toBe("BLOCKED_BY_REVIEWER");
  });
  test("a reply with no citation opens gate 2", () => {
    const outcome = silent(() => handleHcpInquiry("Cardioza dose", "US", makeModel("nocite"), no));
    expect(outcome.status).toBe("BLOCKED_BY_REVIEWER");
    expect(outcome.log.join(" ")).toContain("Gate 2 stops the run");
  });
  test("with no gate, an uncited reply is sent", () => {
    const outcome = handleWithoutGate("Cardioza dose", "US", makeModel("nocite"));
    expect(outcome.status).toBe("SENT_UNCHECKED");
  });
  test("patient details never reach the model", () => {
    let seen = "";
    const spy = (messages: { content: string }[]) => {
      seen = messages.map((message) => message.content).join(" ");
      return { text: "x [DOC-101]" };
    };
    silent(() => handleHcpInquiry("Cardioza dose Patient: Jane Doe SSN 123-45-6789", "US", spy as never, no));
    expect(seen).not.toContain("123-45-6789");
    expect(seen).not.toContain("Jane");
  });
});

describe("lab 4: shapes", () => {
  test("workflow joins records with no model", () => {
    const result = hcpContextWorkflow("H-2");
    expect(result.profile?.country).toBe("DE");
    expect(result.allowedDocs).toEqual(["DOC-102: Cardioza"]);
  });
  test("workflow handles an unknown doctor", () => {
    const result = hcpContextWorkflow("H-9");
    expect(result.profile).toBeUndefined();
    expect(result.allowedDocs).toEqual([]);
  });
  test("one agent picks three tools", () => {
    const result = singleHcpAgent("Cardioza dose", "H-1", makeModel());
    expect(result.steps.filter((step) => step.kind === "tool").length).toBe(3);
    expect(result.answer).toContain("Recent outreach");
  });
  test("auditor passes a true draft", () => {
    expect(silent(() => multiAgentPipeline("Cardioza dose", "US", makeModel(), no)).reply).toContain("10mg");
  });
  test("auditor catches a wrong dose that has a valid citation", () => {
    const draft = runAgentLoop("Cardioza dose", "US", makeModel("invent")).answer;
    expect(verifyOutput(draft, ids).ok).toBe(true); // the citation check is fooled
    const result = silent(() => multiAgentPipeline("Cardioza dose", "US", makeModel("invent"), no));
    expect(result.reply).toBe("REJECTED_BY_COMPLIANCE"); // the auditor is not
  });
});

// Every lab file in labs/ is found by itself. A new lab needs no change here.
describe("every lab", async () => {
  const files = readdirSync("labs").filter((name) => /^\d\d-.*\.ts$/.test(name));
  for (const file of files) {
    const place = existsSync(`show/${file}`) ? "show" : "labs";
    const { lab } = (await import(`../${place}/${file}`)) as { lab: Lab };
    test(`${file}: exports a lab and all ${lab.cases.length} cases behave as explained`, () => {
      expect(lab.file).toBe(file);
      expect(lab.cases.length).toBeGreaterThan(0);
      expect(silent(() => checkCases(lab))).toEqual([]);
    });
  }
});

describe("the readable gate", () => {
  test("flags a short name, an arrow and a regex in PART 1", () => {
    const text = "// PART 1: x\nconst q = items.map((item) => item);\nconst r = text.match(/a/);\n// PART 2: y\n";
    const messages = problemsIn("x.ts", text).map((problem) => problem.message).join("|");
    expect(messages).toContain("too short");
    expect(messages).toContain("not allowed in PART 1");
  });
  test("accepts plain code", () => {
    const text = "// PART 1: x\nfunction add(first: number, second: number) {\n  return first + second;\n}\n// PART 2: y\n";
    expect(problemsIn("x.ts", text)).toEqual([]);
  });
});
