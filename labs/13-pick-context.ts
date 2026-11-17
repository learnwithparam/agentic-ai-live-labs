// Picking what goes in
//
// Dr. Lee asks: "What is the Cardioza dose?" We have three sources of facts: the documents, the
// doctor's profile, and past emails. This question needs only the documents. Loading all three costs
// tokens, hides the useful part, and shows private data the question never needed.
// So we pick the sources a question needs, and load nothing else.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/13-pick-context.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab pick-context --question "What is the Cardioza dose?" --naive
//   bun run lab pick-context --question "What is the Cardioza dose?"
//   bun run lab pick-context --question "Which email was sent to me last?"
//   bun run lab pick-context --question "Given my profile, what is the label?"
//   bun run lab pick-context --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { countTokens } from "./10-context-budget";

export type Source = { name: string; about: string; text: string };

// The model picks. We list each source with one line about it, and it names the ones the question needs.
// The words around the names do not matter. We keep a source only when its name is in the reply.
export function pickSources(question: string, sources: Source[], callLlm: CallLlm): Source[] {
  const shelf: string[] = [];
  for (const source of sources) shelf.push(`- ${source.name}: ${source.about}`);
  const rule = "Reply with the names of the sources the question needs, separated by commas. " +
    "Reply NONE if no source helps.";
  const prompt = `SELECT: ${rule}\nSources:\n${shelf.join("\n")}\nQuestion: ${question}`;
  const reply = (callLlm([{ role: "user", content: prompt }], []).text || "").toLowerCase();

  const picked: Source[] = [];
  for (const source of sources) {
    if (reply.includes(source.name)) picked.push(source);
  }
  return picked;
}

export function costOf(sources: Source[]): number {
  let tokens = 0;
  for (const source of sources) tokens += countTokens(source.text);
  return tokens;
}

export type Picked = { picked: Source[]; reply: string; log: string[] };

// Pick the sources a question needs, then let the model answer from them. Read the steps in order.
export function answerFromPicked(question: string, sources: Source[], callLlm: CallLlm): Picked {
  // Step 1: the model picks the sources the question needs.
  const picked = pickSources(question, sources, callLlm);
  const names: string[] = [];
  for (const source of picked) names.push(source.name);
  const cost = costOf(picked);
  const log = [`Step 1: picked ${names.join(", ") || "nothing"}. It costs ${cost} tokens.`];

  // Step 2: with nothing picked, the agent asks. The model is not called.
  if (picked.length === 0) {
    log.push("Step 2: no source matches, so the agent asks what the doctor needs.");
    return { picked, reply: "", log };
  }

  // Step 3: the model answers from the picked sources only.
  const texts: string[] = [];
  for (const source of picked) texts.push(source.text);
  const prompt = `CONTEXT: ${question}\n${texts.join("\n")}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  const text = (reply.text || "").trim();
  log.push(`Step 2: loaded ${picked.length} sources.`);
  log.push(`Step 3: the model wrote: ${text}`);
  return { picked, reply: text, log };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/13-pick-context");
  runLab(lab);
}
