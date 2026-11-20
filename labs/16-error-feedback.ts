// Giving the model a useful error
//
// The Expense Manager files each receipt to the accounting API. The model writes the call.
// It writes a category like "fonts", but the API only knows five. The API says no.
// If the error names the allowed values, the model fixes its own call. If it only says "ERROR",
// the model repeats the same mistake. And some receipts, like gift cards, fit no category.
// Only a person can decide those, so the model must ask.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/16-error-feedback.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab error-feedback --question "File the font licence receipt." --naive
//   bun run lab error-feedback --question "File the cloud hosting bill as hosting."
//   bun run lab error-feedback --question "File the Acme client lunch."
//   bun run lab error-feedback --question "File the team gift cards."
//   bun run lab error-feedback --demo

import { RECEIPT_IDS } from "../src/expenses";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { CATEGORIES } from "../src/team";

export type Pair = { receipt: string; category: string };
export type Tool = { (call: Pair): string };
export type Result = { outcome: string; tries: number; reply: string; log: string[] };

const RULE = 'Reply with one JSON object only: {"receipt": "...", "category": "..."}. ' +
  "If no category fits, reply ASK.";

// Let the model write the call. When the tool fails, show it the error and let it try again.
export function runWithFeedback(
  task: string,
  callLlm: CallLlm,
  tool: Tool,
  maxTries: number,
): Result {
  const log: string[] = [];
  let note = "";
  let reply = "";
  for (let tries = 1; tries <= maxTries; tries++) {
    // Step 1: the model writes the call. After a failure it also sees its last call and the error.
    const prompt = `FILE: ${RULE}\nTask: ${task}${note}`;
    const text = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
    const call = readPair(text);

    // Step 2: the model says ASK, or writes nonsense. Only a person can go on.
    if (call === undefined) {
      log.push(`Try ${tries}: the model asked for a person. It wrote: ${text}`);
      return { outcome: "ask-person", tries, reply, log };
    }

    // Step 3: run the tool with the call. A good result ends the loop.
    reply = tool(call);
    log.push(`Try ${tries}: ${call.receipt} as ${call.category} gave: ${reply}`);
    if (!reply.startsWith("ERROR")) return finish(reply, tries, log);

    // Step 4: send the error back. This is what the model learns from.
    note = `\nYour last call: ${JSON.stringify(call)}\nThe tool said: ${reply}`;
  }
  return { outcome: "gave-up", tries: maxTries, reply, log };
}

// A useful error says what was wrong AND what is valid.
export function fileTool(call: Pair): string {
  if (!RECEIPT_IDS.includes(call.receipt)) {
    return `ERROR: no receipt "${call.receipt}". Known receipts: ${RECEIPT_IDS.join(", ")}.`;
  }
  if (!CATEGORIES.includes(call.category)) {
    return `ERROR: category "${call.category}" is not valid. Use one of: ${CATEGORIES.join(", ")}.`;
  }
  return `Filed ${call.receipt} as ${call.category}.`;
}

// Keep only the braces and what is inside. A model may add words around the call.
function readPair(text: string): Pair | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return undefined;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return { receipt: String(parsed.receipt), category: String(parsed.category) };
  } catch {
    return undefined;
  }
}

function finish(reply: string, tries: number, log: string[]): Result {
  if (tries === 1) return { outcome: "answered", tries, reply, log };
  return { outcome: "fixed", tries, reply, log };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/16-error-feedback");
  runLab(lab);
}
