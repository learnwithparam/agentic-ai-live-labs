// Lab 5: Tool schemas and structured output
//
// A model writes its tool call as text. Text can be wrong.
// A schema says what a good call looks like. Code checks the call BEFORE the tool runs.
// The PART 2 section only prints the result in colour.
//
// Run it (copy any line):
//   bun labs/05-tool-schemas.ts --question "{"drug": "Cardioza", "country": "us"}" --naive
//   bun labs/05-tool-schemas.ts --question "{"drug": "Cardioza", "country": "US", "limit": 2}"
//   bun labs/05-tool-schemas.ts --question "{"drug": "Cardioza", "country": "us"}"
//   bun labs/05-tool-schemas.ts --demo
//   bun labs/05-tool-schemas.ts --demo

import { NO_DOC } from "../src/data";
import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, bold, box, dim, field, green, highlight } from "../src/ui";
import { print, red, rule, yellow } from "../src/ui";
import { searchApprovedDocs } from "./01-agent-loop"; // the search tool from lab 1

// PART 1: THE CORE LOGIC

// One input of the tool. "allowed" lists the only values it accepts. Numbers have a range.
export type Field = {
  name: string; kind: string; required: boolean;
  allowed?: string[]; low?: number; high?: number;
};

export const searchSchema: Field[] = [
  { name: "drug", kind: "text", required: true },
  { name: "country", kind: "text", required: true, allowed: ["US", "DE"] },
  { name: "limit", kind: "number", required: false, low: 1, high: 5 },
];

export type Args = Record<string, string | number>;
export type Verdict = { status: string; args: Args; notes: string[] };
function reject(note: string): Verdict {
  return { status: "rejected", args: {}, notes: [note] };
}

// Fix a field if the fix is obvious and safe. Otherwise return the value unchanged.
function tidy(field: Field, value: unknown, notes: string[]): unknown {
  const isNumberText = typeof value === "string" && value.trim() !== "" && !isNaN(Number(value));
  if (field.kind === "number" && isNumberText) {
    notes.push(`${field.name}: text "${value}" became the number ${Number(value)}`);
    return Number(value);
  }
  if (field.allowed && typeof value === "string") {
    for (const choice of field.allowed) {
      if (choice.toLowerCase() === value.toLowerCase() && choice !== value) {
        notes.push(`${field.name}: "${value}" became "${choice}"`);
        return choice;
      }
    }
  }
  return value;
}

function isInSchema(name: string, schema: Field[]): boolean {
  for (const field of schema) {
    if (field.name === name) return true;
  }
  return false;
}

// THE CHECK. Parse the text, then test every field against the schema.
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

export type RunTool = { (args: Args): string };

// Check first. The tool runs only when the call passed.
export function callWithSchema(raw: string, schema: Field[], run: RunTool) {
  const verdict = checkToolCall(raw, schema);
  if (verdict.status === "rejected") return { verdict, result: "" };
  return { verdict, result: run(verdict.args) };
}

// The tool itself, and the NAIVE way: trust the text and run it.
export function searchTool(args: Args): string {
  return searchApprovedDocs(String(args.drug), String(args.country));
}

export function naiveCall(raw: string): string {
  const parsed = JSON.parse(raw);
  return searchApprovedDocs(parsed.drug, parsed.country);
}

// PART 2: HOW IT IS SHOWN (you can skip this)

const GOOD = '{"drug": "Cardioza", "country": "US", "limit": 2}';

export const lab: Lab = {
  file: "05-tool-schemas.ts",
  title: "Lab 5: tool schemas and structured output",
  about:
    "The question box takes the text a model wrote as its tool call. A schema checks it first. A good call runs. An easy fix is made and noted. A bad call is rejected, and the tool never runs.",
  terms: "schema = the shape of a good call. JSON = text that holds fields. reject = refuse to run.",
  challenge: "A model writes tool calls as text. A small mistake can fail with no error at all.",
  promise: "A call that fails the schema never reaches the tool.",
  production: "Every tool gets a schema. Real systems use a schema library and the model API's own tool format.",
  cases: [
    { title: "NAIVE: trust the text", why: "The country is written in lower case. With no check, the search finds nothing and nobody is told why. It looks like there is no approved document.", question: '{"drug": "Cardioza", "country": "us"}', flags: { naive: "true" }, expect: "silent-miss" },
    { title: "A good call", why: "Every field is right. The tool runs.", question: GOOD, expect: "ok" },
    { title: "Easy fix: lower case country", why: "The fix is safe, so we make it and write a note. The same call now finds the document.", question: '{"drug": "Cardioza", "country": "us"}', expect: "repaired" },
    { title: "Easy fix: a number written as text", why: "The limit is the text 3. We turn it into the number 3 and note it.", question: '{"drug": "Cardioza", "country": "DE", "limit": "3"}', expect: "repaired" },
    { title: "Extra field the schema does not know", why: "A field called delete_all is dropped and noted. The tool never sees it.", question: '{"drug": "Cardioza", "country": "US", "delete_all": true}', expect: "repaired" },
    { title: "Missing field", why: "No drug, so there is nothing to search. We reject. We do not guess.", question: '{"country": "US"}', expect: "rejected" },
    { title: "A country we do not serve", why: "FR is not in the allowed list. A wrong country could show the wrong label, so we reject.", question: '{"drug": "Cardioza", "country": "FR"}', expect: "rejected" },
    { title: "Number out of range", why: "A limit of 99 is above the top of the range, which is 5.", question: '{"drug": "Cardioza", "country": "US", "limit": 99}', expect: "rejected" },
    { title: "Not JSON at all", why: "The model wrote a sentence. There is no call to run.", question: "Please search for Cardioza in the US", expect: "rejected" },
  ],
  play(raw, flags) {
    print(field("Model wrote", dim(raw)));
    if (flags.naive) return playNaive(raw);
    const { verdict, result } = callWithSchema(raw, searchSchema, searchTool);
    rule("SCHEMA CHECK");
    const badge = { ok: badgeGreen("OK"), repaired: badgeYellow("REPAIRED"), rejected: badgeRed("REJECTED") };
    console.log(badge[verdict.status as "ok"]);
    for (const note of verdict.notes) print(field("note", note, verdict.status === "rejected" ? red : yellow));
    if (verdict.status === "rejected") {
      box("TOOL NOT RUN", [red("The call failed the schema. Nothing was searched.")], red);
    } else {
      print(field("args", JSON.stringify(verdict.args), dim));
      print(field("result", highlight(result), result === NO_DOC ? red : green));
    }
    return verdict.status;
  },
};

function playNaive(raw: string): string {
  rule("NO CHECK");
  try {
    const result = naiveCall(raw);
    print(field("result", highlight(result), result === NO_DOC ? red : green));
    if (result === NO_DOC) {
      box("SILENT MISS", [yellow("No error. The call looked fine, yet nothing was found."), bold("Why? Look at the country.")], yellow);
      return "silent-miss";
    }
    return "ran";
  } catch {
    box("CRASH", [red("The text was not JSON, so the run crashed.")], red);
    return "crashed";
  }
}

if (import.meta.main) runLab(lab);
