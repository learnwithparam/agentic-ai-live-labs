// Giving the model a useful error
//
// Dr. Weber asks about "What is the dose of Cardioza in Germany?". The model writes a tool call with country "Germany".
// The tool only knows US and DE, so it fails. If the error says what was wrong and what is valid,
// the model can fix its own call. If the error only says "ERROR", it repeats the same mistake.
// And some mistakes only a person can fix, like a country we do not serve.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/16-error-feedback.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab error-feedback --question "What is the dose of Cardioza in Germany?" --naive
//   bun run lab error-feedback --question "What is the dose of Cardioza in the US?"
//   bun run lab error-feedback --question "What is the dose of Cardioza in Germany?"
//   bun run lab error-feedback --question "What is the dose of Cardiozza in the US?"
//   bun run lab error-feedback --demo

import { KNOWN_DRUGS, NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { searchApprovedDocs } from "./01-agent-loop";

export type Pair = { drug: string; country: string };
export type Tool = { (guess: Pair): string };
export type Result = { outcome: string; tries: number; reply: string; log: string[] };

const RULE = 'Reply with one JSON object only: {"drug": "...", "country": "..."}. ' +
  "If the only fix would change what the doctor asked, reply ASK.";

// Let the model write the call. When the tool fails, show it the error and let it try again.
export function runWithFeedback(
  question: string,
  callLlm: CallLlm,
  tool: Tool,
  maxTries: number,
): Result {
  const log: string[] = [];
  let note = "";
  let reply = "";
  for (let tries = 1; tries <= maxTries; tries++) {
    // Step 1: the model writes the call. After a failure it also sees its last call and the error.
    const prompt = `TRY: ${RULE}\nQuestion: ${question}${note}`;
    const text = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
    const guess = readPair(text);

    // Step 2: the model says ASK, or writes nonsense. Only a person can go on.
    if (guess === undefined) {
      log.push(`Try ${tries}: the model asked for a person. It wrote: ${text}`);
      return { outcome: "ask-person", tries, reply, log };
    }

    // Step 3: run the tool with the call. A good result ends the loop.
    reply = tool(guess);
    log.push(`Try ${tries}: ${guess.drug} in ${guess.country} gave: ${reply.split("\n")[0]}`);
    if (!reply.startsWith("ERROR")) return finish(reply, tries, log);

    // Step 4: send the error back. This is what the model learns from.
    note = `\nYour last call: ${JSON.stringify(guess)}\nThe tool said: ${reply}`;
  }
  return { outcome: "gave-up", tries: maxTries, reply, log };
}

// A useful error says what was wrong AND what is valid.
export function doseTool(guess: Pair): string {
  if (guess.country !== "US" && guess.country !== "DE") {
    return `ERROR: country "${guess.country}" is not valid. Use US or DE.`;
  }
  if (!KNOWN_DRUGS.includes(guess.drug)) {
    return `ERROR: no drug named "${guess.drug}". Known drugs: ${KNOWN_DRUGS.join(", ")}.`;
  }
  return searchApprovedDocs(guess.drug, guess.country);
}

// The naive way: the same checks, but the error says nothing the model can use.
export function naiveTool(guess: Pair): string {
  const reply = doseTool(guess);
  if (reply.startsWith("ERROR")) return "ERROR";
  return reply;
}

// Keep only the braces and what is inside. A model may add words around the call.
function readPair(text: string): Pair | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return undefined;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return { drug: String(parsed.drug), country: String(parsed.country) };
  } catch {
    return undefined;
  }
}

function finish(reply: string, tries: number, log: string[]): Result {
  if (reply === NO_DOC) return { outcome: "no-source", tries, reply, log };
  if (tries === 1) return { outcome: "answered", tries, reply, log };
  return { outcome: "fixed", tries, reply, log };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/16-error-feedback");
  runLab(lab);
}
