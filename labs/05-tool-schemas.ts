// Tool schemas and structured output
//
// Maya at Juniper Studio sends a receipt to the expense bot: "Font licence, twelve fifty, paid 03/04".
// The model must turn it into a tool call for the books. It writes the call as text.
// Text can be wrong: a word where a number belongs, a euro sign, a date that could mean two days.
// A schema says what a good call looks like. Code checks the call before the books are touched.
// Add --call to hand the check a call as if the model had written it. That is how we test bad calls.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/05-tool-schemas.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab tool-schemas --question "Font licence, twelve fifty, paid 03/04" --naive
//   bun run lab tool-schemas --question "Cloud hosting 31.00 USD, 2026-04-30"
//   bun run lab tool-schemas --question "Client lunch with Acme, €48.90 on 2026-04-09"
//   bun run lab tool-schemas --question "Font licence, twelve fifty, paid 03/04"
//   bun run lab tool-schemas --question "Please book this lunch receipt." --call '{"amount": 12.5, "currency": "USD", "date": "03/04", "category": "software"}'
//   bun run lab tool-schemas --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { BANK } from "../src/team";
import { fromSignIn, isInSchema, isIsoDate, reject, expenseSchema, tidy } from "../src/schema"; // the schema and its small fixes
import type { Args, Field, Verdict } from "../src/schema";

export type Called = { raw: string; verdict: Verdict; result: string; log: string[] };

// Turn a receipt into a checked tool call. Read the steps in order.
export function bookWithSchema(receipt: string, callLlm: CallLlm, signIn: Args): Called {
  // Step 1: the model writes the tool call as text.
  const raw = writeCall(receipt, callLlm);
  const log = [`Step 1: the model wrote the call: ${raw}`];

  // Step 2: check the call against the schema. The books have not been touched yet.
  const { verdict, result } = callWithSchema(raw, expenseSchema, bookExpense, signIn);
  log.push(`Step 2: the check says ${verdict.status}.`);
  for (const note of verdict.notes) log.push(`        ${note}`);

  // Step 3: the tool runs only when the call passed.
  if (verdict.status === "rejected") log.push("Step 3: the books were not touched.");
  else log.push(`Step 3: the tool ran: ${result}`);
  return { raw, verdict, result, log };
}

// Ask the model for the call. A model may add words around it, so keep only the braces and what is inside.
export function writeCall(receipt: string, callLlm: CallLlm): string {
  const rule = "Reply with one JSON object. Fields: amount, currency, date, category, country.";
  const prompt = `RECEIPT: ${rule}\nReceipt: ${receipt}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  const text = reply.text || "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return text;
  return text.slice(start, end + 1);
}

// Check first. The tool runs only when the call passed.
export type RunTool = { (args: Args): string };

export function callWithSchema(raw: string, schema: Field[], run: RunTool, signIn: Args = {}) {
  const verdict = checkToolCall(raw, schema, signIn);
  if (verdict.status === "rejected") return { verdict, result: "" };
  return { verdict, result: run(verdict.args) };
}

// The tool itself. It writes to the books and looks for the same payment in the bank lines.
export function bookExpense(args: Args): string {
  const what = `${args.amount} ${args.currency} on ${args.date}`;
  const booked = `Booked ${what} as ${args.category} in ${args.country}.`;
  for (const line of BANK) {
    if (line.amount === args.amount && line.currency === args.currency && line.date === args.date) {
      return `${booked} Matches ${line.id}.`;
    }
  }
  return `${booked} No bank line matches yet.`;
}

// The check. Parse the text, then test every field against the schema.
export function checkToolCall(raw: string, schema: Field[], signIn: Args = {}): Verdict {
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
    let said = parsed[field.name];
    if (field.fromSignIn) said = fromSignIn(field, said, signIn, notes);
    const value = tidy(field, said, notes);
    if (value === undefined && field.required) return reject(`${field.name} is missing`);
    if (value === undefined) continue;
    if (field.kind === "text" && typeof value !== "string") {
      return reject(`${field.name} must be text`);
    }
    if (field.kind === "number" && typeof value !== "number") {
      return reject(`${field.name} must be a number`);
    }
    if (field.kind === "date" && !isIsoDate(value)) {
      return reject(`${field.name} must be a real date like 2026-04-03`);
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
