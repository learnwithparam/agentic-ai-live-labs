// LAB 1: THE AGENT LOOP
//
// Read PART 1 (about 50 lines). That is the whole idea.
// PART 2 only prints the result in colour, so you can skip it.
//
// Run it:   bun labs/01-agent-loop.ts            (menu of examples)
//           bun labs/01-agent-loop.ts --demo     (every edge case, with a reason for each)

import { APPROVED_DOCS, NO_DOC } from "../src/data";
import { modelFrom, runLab, type Lab } from "../src/runner";
import type { CallLlm, Message } from "../src/model";
import { badgeBlue, badgeCyan, bold, box, cyan, field, green, highlight, print, red, verdict, yellow } from "../src/ui";

// ============================================================================
// PART 1: THE CORE LOGIC
// ============================================================================

// A TOOL is just a function. It takes arguments and gives back text.
export type Tool = (args: Record<string, string>) => string;

// Our one tool: look up approved documents.
// A document is returned only if the drug is named in the question AND it is approved for the doctor's country.
export function searchApprovedDocs(query: string, country: string): string {
  const hits: string[] = [];
  for (const [id, doc] of Object.entries(APPROVED_DOCS)) {
    const rightCountry = doc.country === country;
    const drugMentioned = query.toLowerCase().includes(doc.drug.toLowerCase());
    if (rightCountry && drugMentioned) hits.push(`[${id}] ${doc.text}`);
  }
  if (hits.length === 0) return NO_DOC; // nothing found: say so, never guess
  return hits.join("\n");
}

// The list of tools the model is allowed to use. A name that is not here is refused.
export const searchOnly: Record<string, Tool> = {
  search_approved_docs: (args) => searchApprovedDocs(args.query, args.country),
};

// One thing that happened in the loop, kept so we can show it later.
export type Step =
  | { kind: "tool"; tool: string; args: Record<string, string>; result: string }
  | { kind: "answer"; text: string };

export type LoopResult = { answer: string; steps: Step[]; stopped: boolean };

// THE AGENT LOOP
//   1. Ask the model what to do next.
//   2. If it wants a tool, run the tool and show the model the result. Go to 1.
//   3. If it gives a final answer, we are done.
//   4. If it keeps going past maxSteps, stop it. A model that never finishes must not run forever.
export function runAgentLoop(
  question: string,
  country: string,
  callLlm: CallLlm,
  options: { tools?: Record<string, Tool>; maxSteps?: number; hcpId?: string } = {},
): LoopResult {
  const tools = options.tools ?? searchOnly;
  const maxSteps = options.maxSteps ?? 5;

  // The conversation so far. The model reads all of it every time.
  const messages: Message[] = [
    { role: "system", content: "Answer using ONLY the approved documents from search_approved_docs. Cite doc ids." },
    { role: "user", content: `Country: ${country}. HCP: ${options.hcpId ?? "none"}. Question: ${question}` },
  ];
  const steps: Step[] = [];

  for (let stepNumber = 1; stepNumber <= maxSteps; stepNumber++) {
    const reply = callLlm(messages, Object.keys(tools)); // 1. ask the model

    if (reply.toolCall) {
      const { name, args } = reply.toolCall;
      const tool = tools[name];
      const result = tool ? tool(args) : `TOOL_NOT_ALLOWED: ${name}`; // 2. run the tool, or refuse it
      steps.push({ kind: "tool", tool: name, args, result });
      messages.push({ role: "tool", name, content: result }); // show the model what happened
      continue;
    }

    const text = reply.text ?? "";
    steps.push({ kind: "answer", text }); // 3. final answer
    return { answer: text, steps, stopped: false };
  }

  return { answer: "STOPPED: max loop steps reached.", steps, stopped: true }; // 4. too many steps
}

// ============================================================================
// PART 2: HOW IT IS SHOWN (you can skip this)
// ============================================================================

export const lab1: Lab = {
  file: "01-agent-loop.ts",
  title: "Lab 1: the agent loop",
  about:
    "The model asks for a tool, our code runs it, the model reads the result, and the loop repeats until the model answers. The only source of facts is the approved document search. The country decides which documents the doctor may see.",
  cases: [
    { title: "A normal question", why: "The happy path. One search, then an answer that cites its source.", question: "What is the dose of Cardioza?", expect: "answered" },
    { title: "Same question, different country", why: "Approved text differs by country. Germany gets 5mg where the US gets 10mg. The tool filters by country, so the model cannot override it.", question: "What is the dose of Cardioza?", flags: { country: "DE" }, expect: "answered" },
    { title: "Capital letters", why: "Search ignores case, so shouting the drug name still works.", question: "CARDIOZA dose please", expect: "answered" },
    { title: "Two drugs in one question", why: "One search can return two documents. The answer must cite both.", question: "What is the dose of Cardioza and Neurovex?", expect: "answered" },
    { title: "A drug we have no document for", why: "The search finds nothing, so the model must refuse instead of guessing from memory.", question: "Is Zorbex safe for children?", expect: "no-source" },
    { title: "Approved in another country only", why: "Dermalin is approved in the US only. A German doctor gets no answer, which is the right behaviour.", question: "What is the dose of Dermalin?", flags: { country: "DE" }, expect: "no-source" },
    { title: "A spelling mistake", why: "Search needs the exact drug name. A typo finds nothing. A real system would add fuzzy matching or ask the doctor to confirm.", question: "What is the dose of Cardiozza?", expect: "no-source" },
    { title: "Not a drug question at all", why: "Small talk has no approved source. The loop still ends safely.", question: "How are you today?", expect: "no-source" },
    { title: "The loop hits its step limit", why: "We allow only 1 step, so the model gets one tool call and no turn left to answer. A step limit stops a model that never finishes.", question: "What is the dose of Cardioza?", flags: { steps: "1" }, expect: "stopped" },
  ],
  play(question, f) {
    const country = f.country ?? "US";
    const result = runAgentLoop(question, country, modelFrom(f), { maxSteps: Number(f.steps ?? 5) });
    print(field("Question", question));
    print(field("Country", country));
    for (const [i, s] of result.steps.entries()) {
      console.log();
      if (s.kind === "tool") {
        console.log(`${badgeBlue(`STEP ${i + 1}`)} ${bold("model asks for a tool")}`);
        print(field("  tool", s.tool, cyan));
        print(field("  input", `query="${s.args.query}" country=${s.args.country}`));
        print(field("  result", highlight(s.result), s.result === NO_DOC ? red : green));
      } else console.log(`${badgeCyan(`STEP ${i + 1}`)} ${bold("model answers")}`);
    }
    console.log();
    if (result.stopped) {
      box("STOPPED", [verdict.blocked("Step limit reached before the model answered.")], red);
      return "stopped";
    }
    const cited = result.answer.includes("[DOC-");
    box(cited ? "ANSWER" : "NO APPROVED SOURCE", field("", highlight(result.answer), cited ? green : yellow, 0), cited ? green : yellow);
    return cited ? "answered" : "no-source";
  },
};

if (import.meta.main) runLab(lab1);
