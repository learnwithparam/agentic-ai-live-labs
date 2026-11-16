import type { CallLlm, Message } from "./model";
import { tools } from "./tools";

export type Step = { step: number; kind: "tool" | "answer"; detail: string };
export type LoopResult = { answer: string; steps: Step[]; stopped: boolean };

const SYSTEM = "Answer using ONLY the approved documents from search_approved_docs. Cite doc ids.";

// The agent loop: ask the model, run the tool it chose, give the result back, repeat.
// It ends when the model answers, or when max steps is reached.
export function runAgentLoop(
  question: string,
  country: string,
  callLlm: CallLlm,
  opts: { toolNames?: string[]; hcpId?: string; maxSteps?: number } = {},
): LoopResult {
  const toolNames = opts.toolNames ?? ["search_approved_docs"];
  const maxSteps = opts.maxSteps ?? 5;
  const messages: Message[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Country: ${country}. HCP: ${opts.hcpId ?? "none"}. Question: ${question}` },
  ];
  const steps: Step[] = [];

  for (let step = 1; step <= maxSteps; step++) {
    const reply = callLlm(messages, toolNames);
    if (reply.toolCall) {
      const { name, args } = reply.toolCall;
      // A tool that is not on the list is refused, never run.
      const result = toolNames.includes(name) ? tools[name](args) : `TOOL_NOT_ALLOWED: ${name}`;
      steps.push({ step, kind: "tool", detail: `${name}(${JSON.stringify(args)}) -> ${result}` });
      messages.push({ role: "tool", name, content: result });
      continue;
    }
    steps.push({ step, kind: "answer", detail: reply.text ?? "" });
    return { answer: reply.text ?? "", steps, stopped: false };
  }
  return { answer: "STOPPED: max loop steps reached.", steps, stopped: true };
}
