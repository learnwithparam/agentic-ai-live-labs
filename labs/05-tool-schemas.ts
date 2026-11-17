// Tool schemas and structured output
//
// Dr. Lee asks: "What is the Cardioza dose in the US?" The model must turn that into a tool call.
// It writes the call as text. Text can be wrong: a small letter where a capital belongs, a field
// missing, a number written as a word. A schema says what a good call looks like.
// Code checks the call before the tool runs.
// Add --call to hand the check a call as if the model had written it. That is how we test bad calls.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/05-tool-schemas.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab tool-schemas --question "What is the Cardioza dose in the US?" --call '{"drug": "Cardioza", "country": "us"}' --naive
//   bun run lab tool-schemas --question "What is the Cardioza dose in the US?"
//   bun run lab tool-schemas --question "What is the Cardioza dose in the US?" --call '{"drug": "Cardioza", "country": "us"}'
//   bun run lab tool-schemas --question "What is the Cardioza dose in the US?" --call '{"drug": "Cardioza", "country": "FR"}'
//   bun run lab tool-schemas --question "What is the Cardioza dose in the US?" --call "Please search for Cardioza in the US"
//   bun run lab tool-schemas --demo

import { NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { searchApprovedDocs } from "./01-agent-loop";
import { isInSchema, reject, searchSchema, tidy } from "../src/schema"; // the schema and its small fixes
import type { Args, Field, Verdict } from "../src/schema";

export type Called = { raw: string; verdict: Verdict; result: string; log: string[] };

// Turn a question into a checked tool call. Read the steps in order.
export function searchWithSchema(question: string, callLlm: CallLlm): Called {
  // Step 1: the model writes the tool call as text.
  const raw = writeCall(question, callLlm);
  const log = [`Step 1: the model wrote the call: ${raw}`];

  // Step 2: check the call against the schema. The tool has not run yet.
  const { verdict, result } = callWithSchema(raw, searchSchema, searchTool);
  log.push(`Step 2: the check says ${verdict.status}.`);
  for (const note of verdict.notes) log.push(`        ${note}`);

  // Step 3: the tool runs only when the call passed.
  if (verdict.status === "rejected") log.push("Step 3: the tool did not run.");
  else log.push(`Step 3: the tool ran and found: ${result}`);
  return { raw, verdict, result, log };
}

// Ask the model for the call. A model may add words around it, so keep only the braces and what is inside.
export function writeCall(question: string, callLlm: CallLlm): string {
  const rule = "Reply with one JSON object only. Fields: drug, country (US or DE), limit (1 to 5).";
  const prompt = `CALL: ${rule}\nQuestion: ${question}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  const text = reply.text || "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return text;
  return text.slice(start, end + 1);
}

// Check first. The tool runs only when the call passed.
export type RunTool = { (args: Args): string };

export function callWithSchema(raw: string, schema: Field[], run: RunTool) {
  const verdict = checkToolCall(raw, schema);
  if (verdict.status === "rejected") return { verdict, result: "" };
  return { verdict, result: run(verdict.args) };
}

// The tool itself.
export function searchTool(args: Args): string {
  return searchApprovedDocs(String(args.drug), String(args.country));
}

// The check. Parse the text, then test every field against the schema.
export function checkToolCall(raw: string, schema: Field[]): Verdict {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return reject("the call is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) return reject("the call is not an object");
  const notes: string[] = [];
  const args: Args = {};
  for (const field of schema) {
    const value = tidy(field, parsed[field.name], notes);
    if (value === undefined && field.required) return reject(`${field.name} is missing`);
    if (value === undefined) continue;
    if (field.kind === "text" && typeof value !== "string") {
      return reject(`${field.name} must be text`);
    }
    if (field.kind === "number" && typeof value !== "number") {
      return reject(`${field.name} must be a number`);
    }
    if (field.allowed && !field.allowed.includes(String(value))) {
      return reject(`${field.name} must be one of ${field.allowed.join(", ")}`);
    }
    if (typeof value === "number" && (value < field.low! || value > field.high!)) {
      return reject(`${field.name} must be from ${field.low} to ${field.high}`);
    }
    args[field.name] = value as string | number;
  }
  for (const name in parsed) {
    if (!isInSchema(name, schema)) notes.push(`${name}: not in the schema, dropped`);
  }
  if (notes.length > 0) return { status: "repaired", args, notes };
  return { status: "ok", args, notes };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/05-tool-schemas");
  runLab(lab);
}
