// The schema for the tool schema lab, and the small safe fixes the check can make.
// You do not need to read this file to learn the lab. The check itself is in labs/05-tool-schemas.ts.
import { CATEGORIES, HOUSE_CODES } from "./team";

export type Field = {
  name: string; kind: string; required: boolean;
  allowed?: string[]; low?: number; high?: number;
  aliases?: Record<string, string>; // safe swaps, such as the euro sign for EUR
  words?: Record<string, string>;   // studio words, from the word list
  fromSignIn?: boolean;             // the value comes from the sign-in, never from the chat
};

// The books take only these fields. Each one has a type and a rule.
export const expenseSchema: Field[] = [
  { name: "amount", kind: "number", required: true, low: 0.01, high: 10000 },
  { name: "currency", kind: "text", required: true, allowed: ["USD", "EUR", "GBP"], aliases: { $: "USD", "€": "EUR", "£": "GBP" } },
  { name: "date", kind: "date", required: true },
  { name: "category", kind: "text", required: true, allowed: CATEGORIES, words: HOUSE_CODES },
  { name: "country", kind: "text", required: true, allowed: ["US", "DE"], fromSignIn: true },
];

export type Args = Record<string, string | number>;
export type Verdict = { status: string; args: Args; notes: string[] };
export function reject(note: string): Verdict {
  return { status: "rejected", args: {}, notes: [note] };
}

// A date is good only when it is written as 2026-04-03 and the day is real.
export function isIsoDate(value: unknown): boolean {
  if (typeof value !== "string" || value.length !== 10) return false;
  const day = new Date(`${value}T00:00:00Z`);
  return !isNaN(day.getTime()) && day.toISOString().slice(0, 10) === value;
}

// A value that must come from the sign-in. If the chat said something else, we say so and use the sign-in.
export function fromSignIn(field: Field, said: unknown, signIn: Args, notes: string[]): unknown {
  const real = signIn[field.name];
  if (said !== undefined && real !== undefined && said !== real) {
    notes.push(`${field.name}: the chat said "${said}", the sign-in says "${real}", so we use "${real}"`);
  }
  return real;
}

// Fix a field if the fix is obvious and safe. Otherwise return the value unchanged.
export function tidy(field: Field, value: unknown, notes: string[]): unknown {
  const isNumberText = typeof value === "string" && value.trim() !== "" && !isNaN(Number(value));
  if (field.kind === "number" && isNumberText) {
    notes.push(`${field.name}: text "${value}" became the number ${Number(value)}`);
    return Number(value);
  }
  if (typeof value === "string" && field.aliases && field.aliases[value]) {
    notes.push(`${field.name}: "${value}" became "${field.aliases[value]}"`);
    return field.aliases[value];
  }
  if (typeof value === "string" && field.words && field.words[value.toLowerCase()]) {
    notes.push(`${field.name}: the word list says "${value}" means "${field.words[value.toLowerCase()]}"`);
    return field.words[value.toLowerCase()];
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

export function isInSchema(name: string, schema: Field[]): boolean {
  for (const field of schema) {
    if (field.name === name) return true;
  }
  return false;
}
