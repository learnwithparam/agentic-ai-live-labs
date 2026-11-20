// The agent loop
//
// Dr. Lee asks: "What is the dose of Cardioza?" The model does not know. It has no facts.
// All it can do is ask for a tool. Our code runs the tool and gives the result back.
// This goes round and round until the model gives an answer. That is an agent loop.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/01-agent-loop.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab agent-loop --question "What is the dose of Cardioza?"
//   bun run lab agent-loop --question "What is the dose of Cardioza?" --country DE
//   bun run lab agent-loop --question "Can you tell me the CARDIOZA dose please?"
//   bun run lab agent-loop --question "What is the dose of Cardioza and Neurovex?"
//   bun run lab agent-loop --demo

import { APPROVED_DOCS, NO_DOC } from "../src/data";
import type { CallLlm, Message, ToolInput } from "../src/model";
import { runLab } from "../src/runner";

// A tool is a name plus a function. The model picks the name. Our code runs the function.
export type Tool = { name: string; run(input: ToolInput): string };

export type Step = { kind: string; tool: string; input: string; result: string };
export type LoopResult = {
  answer: string;
  steps: Step[];
  stopped: boolean;
  log: string[];
  why?: string;
};

// Answer a question with the loop. Read the steps in order. Step 2 and Step 3 repeat.
export function runAgentLoop(
  question: string,
  country: string,
  callLlm: CallLlm,
  tools: Tool[] = searchOnly,
  maxSteps = 5,
  hcpId = "none",
): LoopResult {
  const log: string[] = [];
  const steps: Step[] = [];
  const toolNames: string[] = [];
  const seen: string[] = [];
  for (const tool of tools) toolNames.push(tool.name);

  // Step 1: start the conversation with the rules and the question. The model reads all of it.
  const messages: Message[] = [
    { role: "system", content: "Use ONLY the approved documents. Cite their ids." },
    { role: "user", content: `Country: ${country}. HCP: ${hcpId}. Question: ${question}` },
  ];
  log.push(`Step 1: started with the question "${question}" for country ${country}.`);

  for (let round = 1; round <= maxSteps; round++) {
    // Step 2: ask the model what to do next.
    const reply = callLlm(messages, toolNames);

    if (reply.toolCall) {
      // Step 3: the model wants a tool. Find it. A tool we did not give it is refused.
      const call = reply.toolCall;
      const tool = findTool(tools, call.name);
      let result = `TOOL_NOT_ALLOWED: ${call.name}`;
      if (tool) result = tool.run(call.args);

      // Show the model what the tool returned, so its next answer can use it.
      const input = `query="${call.args.query}" country=${call.args.country}`;
      // The same call twice will give the same result. That is a loop, so stop it.
      if (seen.includes(`${call.name} ${input}`)) {
        log.push(`Step 5: the call ${call.name} ${input} came twice. Stopped.`);
        const answer = "STOPPED: the same call came twice.";
        return { answer, steps, stopped: true, log, why: "same call twice" };
      }
      seen.push(`${call.name} ${input}`);
      steps.push({ kind: "tool", tool: call.name, input, result });
      messages.push({ role: "tool", name: call.name, content: result });

      // Write down what happened, for the log.
      log.push(`Step 2: asked the model. It wants the tool ${call.name}.`);
      log.push(`Step 3: ran the tool with ${input}. It returned: ${result}`);
      continue;
    }

    // Step 4: the model gave an answer. We are done.
    const answer = reply.text || "";
    steps.push({ kind: "answer", tool: "", input: "", result: answer });

    log.push("Step 2: asked the model. It gave an answer.");
    log.push(`Step 4: done. The answer is: ${answer}`);
    return { answer, steps, stopped: false, log };
  }

  // Step 5: the model never finished. Stop it, so a loop can never run forever.
  log.push(`Step 5: stopped after ${maxSteps} rounds. The model did not give an answer.`);
  const answer = "STOPPED: max loop steps reached.";
  return { answer, steps, stopped: true, log, why: "step limit" };
}

// What the loop calls: the tool.
// Our one tool looks up approved documents. It needs two things to match.
// The drug must be in the question. The document must be approved for the doctor's country.
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

// The model may use only the tools in this list. Any other name is refused.
export const searchOnly: Tool[] = [{ name: "search_approved_docs", run: searchTool }];

function findTool(tools: Tool[], name: string): Tool | undefined {
  for (const tool of tools) {
    if (tool.name === name) return tool;
  }
  return undefined;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/01-agent-loop");
  runLab(lab);
}
