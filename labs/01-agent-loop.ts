// LAB 1: THE AGENT LOOP
//
// Read PART 1. It is short. The model asks for a tool, the code runs it, and this repeats.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun labs/01-agent-loop.ts --question "What is the dose of Cardioza?"
//   bun labs/01-agent-loop.ts --question "What is the dose of Cardioza?" --country DE
//   bun labs/01-agent-loop.ts --question "CARDIOZA dose please"
//   bun labs/01-agent-loop.ts --question "What is the dose of Cardioza and Neurovex?"
//   bun labs/01-agent-loop.ts --demo

import { APPROVED_DOCS, NO_DOC } from "../src/data";
import type { CallLlm, Message, ToolInput } from "../src/model";
import { modelFrom, runLab, type Lab } from "../src/runner";
import { badgeBlue, badgeCyan, bold, box, cyan, field, green, highlight } from "../src/ui";
import { print, red, verdict, yellow } from "../src/ui";

// PART 1: THE CORE LOGIC

// A tool is a name plus a function. The function takes the model's input and gives back text.
export type Tool = { name: string; run(input: ToolInput): string };

// Our one tool. It looks up approved documents.
// A document is used only if the drug is named in the question
// AND the document is approved for the doctor's country.
export function searchApprovedDocs(query: string, country: string): string {
  const hits: string[] = [];
  for (const id in APPROVED_DOCS) {
    const doc = APPROVED_DOCS[id];
    const rightCountry = doc.country === country;
    const drugIsNamed = query.toLowerCase().includes(doc.drug.toLowerCase());
    if (rightCountry && drugIsNamed) hits.push(`[${id}] ${doc.text}`);
  }
  if (hits.length === 0) return NO_DOC; // Nothing found. Say so. Never guess.
  return hits.join("\n");
}

function searchTool(input: ToolInput): string {
  return searchApprovedDocs(input.query, input.country);
}

// The tools the model may use. A name that is not in this list is refused.
export const searchOnly: Tool[] = [{ name: "search_approved_docs", run: searchTool }];

// One thing that happened in the loop. We keep it so we can show it later.
export type Step = { kind: string; tool: string; input: string; result: string };
export type LoopResult = { answer: string; steps: Step[]; stopped: boolean };

function findTool(tools: Tool[], name: string): Tool | undefined {
  for (const tool of tools) {
    if (tool.name === name) return tool;
  }
  return undefined;
}

// The loop: ask the model, run the tool it picks, and stop when it gives an answer.
//   1. Ask the model what to do next.
//   2. If it wants a tool, run the tool and show the model the result. Then go back to 1.
//   3. If it gives an answer, we are done.
//   4. If it is still going after maxSteps, stop it. A loop must never run forever.
export function runAgentLoop(
  question: string,
  country: string,
  callLlm: CallLlm,
  tools: Tool[] = searchOnly,
  maxSteps = 5,
  hcpId = "none",
): LoopResult {
  const toolNames: string[] = [];
  for (const tool of tools) toolNames.push(tool.name);

  // The conversation so far. The model reads all of it each time.
  const messages: Message[] = [
    { role: "system", content: "Use ONLY the approved documents. Cite their ids." },
    { role: "user", content: `Country: ${country}. HCP: ${hcpId}. Question: ${question}` },
  ];
  const steps: Step[] = [];

  for (let stepNumber = 1; stepNumber <= maxSteps; stepNumber++) {
    const reply = callLlm(messages, toolNames); // 1. Ask the model.

    if (reply.toolCall) {
      const call = reply.toolCall;
      const tool = findTool(tools, call.name);
      let result = `TOOL_NOT_ALLOWED: ${call.name}`;
      if (tool) result = tool.run(call.args); // 2. Run the tool.
      const input = `query="${call.args.query}" country=${call.args.country}`;
      steps.push({ kind: "tool", tool: call.name, input, result });
      messages.push({ role: "tool", name: call.name, content: result });
      continue;
    }

    let answer = "";
    if (reply.text) answer = reply.text;
    steps.push({ kind: "answer", tool: "", input: "", result: answer }); // 3. Done.
    return { answer, steps, stopped: false };
  }

  return { answer: "STOPPED: max loop steps reached.", steps, stopped: true }; // 4. Too long.
}

// PART 2: HOW IT IS SHOWN (you can skip this)

export const lab: Lab = {
  file: "01-agent-loop.ts",
  title: "Lab 1: the agent loop",
  about:
    "The model asks for a tool. Our code runs it. The model reads the result. This repeats until the model answers. The only source of facts is the approved document search. The country decides which documents the doctor may see.",
  cases: [
    { title: "A normal question", why: "The happy path. One search, then an answer that cites its source.", question: "What is the dose of Cardioza?", expect: "answered" },
    { title: "Same question, different country", why: "Approved text differs by country. Germany gets 5mg and the US gets 10mg. The tool filters by country, so the model cannot override it.", question: "What is the dose of Cardioza?", flags: { country: "DE" }, expect: "answered" },
    { title: "Capital letters", why: "Search ignores case, so shouting the drug name still works.", question: "CARDIOZA dose please", expect: "answered" },
    { title: "Two drugs in one question", why: "One search can return two documents. The answer must cite both.", question: "What is the dose of Cardioza and Neurovex?", expect: "answered" },
    { title: "A drug we have no document for", why: "The search finds nothing, so the model must refuse. It must not guess from memory.", question: "Is Zorbex safe for children?", expect: "no-source" },
    { title: "Approved in another country only", why: "Dermalin is approved in the US only. A German doctor gets no answer. That is the right behaviour.", question: "What is the dose of Dermalin?", flags: { country: "DE" }, expect: "no-source" },
    { title: "A spelling mistake", why: "Search needs the exact drug name. A typo finds nothing. A real system would match close spellings or ask the doctor to confirm.", question: "What is the dose of Cardiozza?", expect: "no-source" },
    { title: "Not a drug question at all", why: "Small talk has no approved source. The loop still ends safely.", question: "How are you today?", expect: "no-source" },
    { title: "The loop hits its step limit", why: "We allow only 1 step. The model gets one tool call and no turn left to answer. A step limit stops a model that never finishes.", question: "What is the dose of Cardioza?", flags: { steps: "1" }, expect: "stopped" },
  ],
  play(question, flags) {
    const country = flags.country || "US";
    const maxSteps = Number(flags.steps || 5);
    const result = runAgentLoop(question, country, modelFrom(flags), searchOnly, maxSteps);
    print(field("Question", question));
    print(field("Country", country));
    for (const [index, step] of result.steps.entries()) {
      console.log();
      if (step.kind === "answer") {
        console.log(`${badgeCyan(`STEP ${index + 1}`)} ${bold("model answers")}`);
        continue;
      }
      console.log(`${badgeBlue(`STEP ${index + 1}`)} ${bold("model asks for a tool")}`);
      print(field("  tool", step.tool, cyan));
      print(field("  input", step.input));
      const resultColor = step.result === NO_DOC ? red : green;
      print(field("  result", highlight(step.result), resultColor));
    }
    console.log();
    if (result.stopped) {
      box("STOPPED", [verdict.blocked("Step limit reached before the model answered.")], red);
      return "stopped";
    }
    if (result.answer.includes("[DOC-")) {
      box("ANSWER", field("", highlight(result.answer), green, 0), green);
      return "answered";
    }
    box("NO APPROVED SOURCE", field("", highlight(result.answer), yellow, 0), yellow);
    return "no-source";
  },
};

if (import.meta.main) runLab(lab);
