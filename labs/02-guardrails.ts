// LAB 2: GUARDRAILS AND PHI REDACTION
//
// Read PART 1. Two guardrails wrap the model:
//   INPUT guardrail:  hide personal details BEFORE the model sees the note.
//   OUTPUT guardrail: block any reply that does not cite an approved document.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun labs/02-guardrails.ts --demo
//   bun labs/02-guardrails.ts --demo
//   bun labs/02-guardrails.ts --question "Cardioza dose"
//   bun labs/02-guardrails.ts --demo
//   bun labs/02-guardrails.ts --demo

import { APPROVED_DOCS } from "../src/data";
import { modelFrom, runLab, type Lab } from "../src/runner";
import { bold, box, dim, field, green, highlight, mark, print, red, rule, verdict, yellow } from "../src/ui";
import { runAgentLoop } from "./01-agent-loop"; // the loop from lab 1

// PART 1: THE CORE LOGIC

// One piece of private text we found: what kind it is, and the words themselves.
export type Found = { label: string; text: string };

function isDigits(text: string): boolean {
  if (text.length === 0) return false;
  for (const letter of text) {
    if (!"0123456789".includes(letter)) return false;
  }
  return true;
}

// True if the word is digit groups split by a symbol, like 123-45-6789 (sizes 3, 2, 4).
function hasShape(word: string, symbol: string, sizes: number[]): boolean {
  const groups = word.split(symbol);
  if (groups.length !== sizes.length) return false;
  for (let index = 0; index < sizes.length; index++) {
    if (groups[index].length !== sizes[index]) return false;
    if (!isDigits(groups[index])) return false;
  }
  return true;
}

function isDate(word: string): boolean {
  return word.split("/").length === 3 && isDigits(word.replaceAll("/", ""));
}

function isEmail(word: string): boolean {
  const parts = word.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1].includes(".");
}

// A name word starts with a capital and is lowercase after that, like Jane.
function isNameWord(word: string): boolean {
  if (word.length < 2) return false;
  return word === word[0].toUpperCase() + word.slice(1).toLowerCase();
}

// Split "(123-45-6789)," into the symbols in front, the word, and the symbols behind.
function splitSymbols(word: string): { before: string; core: string; after: string } {
  let start = 0;
  let end = word.length;
  while (start < end && "(\"'".includes(word[start])) start++;
  while (end > start && ".,;)?!\"'".includes(word[end - 1])) end--;
  return { before: word.slice(0, start), core: word.slice(start, end), after: word.slice(end) };
}

type Spot = { label: string; token: string; used: number };

function coreOf(words: string[], position: number): string {
  if (position >= words.length) return "";
  return splitSymbols(words[position]).core;
}

// Count the name words in a row, starting at position.
function countNameWords(words: string[], position: number): number {
  let count = 0;
  while (isNameWord(coreOf(words, position + count))) count++;
  return count;
}

// Look at the words from position on. If they start a private piece, say what it is.
// "used" is how many words the piece takes up.
function spotPrivate(words: string[], position: number): Spot | null {
  const word = coreOf(words, position);
  const next = coreOf(words, position + 1);
  const letters = word.replace(":", "").toUpperCase();

  if (hasShape(word, "-", [3, 2, 4])) return { label: "SSN", token: "[SSN]", used: 1 };
  if (hasShape(word, "-", [3, 3, 4])) return { label: "phone", token: "[PHONE]", used: 1 };
  if (isEmail(word)) return { label: "email", token: "[EMAIL]", used: 1 };
  if (letters === "MRN" && isDigits(next) && next.length >= 5) {
    return { label: "MRN", token: "[MRN]", used: 2 };
  }
  if (letters === "DOB" && isDate(next)) return { label: "birth date", token: "[DOB]", used: 2 };
  if (word === "Patient:" && countNameWords(words, position + 1) >= 2) {
    const nameWords = countNameWords(words, position + 1);
    return { label: "patient name", token: "Patient: [NAME]", used: 1 + nameWords };
  }
  return null;
}

// INPUT GUARDRAIL: walk through the words and swap every private piece for a token.
export function redactPhi(raw: string): { clean: string; found: Found[] } {
  const words = raw.split(" ");
  const out: string[] = [];
  const found: Found[] = [];
  let position = 0;
  while (position < words.length) {
    const spot = spotPrivate(words, position);
    if (spot === null) {
      out.push(words[position]);
      position++;
      continue;
    }
    // Keep the symbols that sat in front of the piece and behind it, like ( and ,
    const first = splitSymbols(words[position]);
    const last = splitSymbols(words[position + spot.used - 1]);
    const original = words.slice(position, position + spot.used).join(" ");
    const text = original.slice(first.before.length, original.length - last.after.length);
    found.push({ label: spot.label, text });
    out.push(first.before + spot.token + last.after);
    position += spot.used;
  }
  return { clean: out.join(" "), found };
}

// The kinds of private text we found, as a list of names.
export function labelsOf(found: Found[]): string[] {
  const labels: string[] = [];
  for (const item of found) labels.push(item.label);
  return labels;
}

// OUTPUT GUARDRAIL: the reply must cite a document, and every cited id must be a real approved one.
export type Check = { ok: boolean; reason: string };

export function verifyOutput(draft: string, approvedIds: string[]): Check {
  const pieces = draft.split("[DOC-");
  if (pieces.length === 1) return { ok: false, reason: "BLOCKED: no approved source citation." };
  for (const piece of pieces.slice(1)) {
    const id = "DOC-" + piece.split("]")[0];
    if (!approvedIds.includes(id)) return { ok: false, reason: `BLOCKED: unknown source ${id}.` };
  }
  return { ok: true, reason: "" };
}

// PART 2: HOW IT IS SHOWN (you can skip this)

export const lab: Lab = {
  file: "02-guardrails.ts",
  title: "Lab 2: guardrails and PHI redaction",
  about:
    "Two guardrails wrap the model. The input guardrail hides personal and patient details on our side, before any model sees the note. The output guardrail refuses a reply that has no approved citation.",
  cases: [
    { title: "Name, social security number and phone", why: "The classic case. All three are hidden, and the model only ever sees the tokens.", question: "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) on Cardioza dose", expect: "3 masked, passed" },
    { title: "Email, record number and birth date", why: "Other formats the input guardrail knows about.", question: "Cardioza dose for jane.doe@mail.com, MRN 1234567, DOB: 04/12/1980", expect: "3 masked, passed" },
    { title: "Nothing private", why: "A clean question passes through unchanged. No false alarms.", question: "Cardioza dose", expect: "0 masked, passed" },
    { title: "EDGE: a number format we do not know", why: "The SSN has no dashes, so our rule misses it and it stays in the note. This is the limit of rule-based hiding. Real systems add a trained detector and a review step.", question: "Patient has SSN 123456789 and takes Cardioza, dose?", expect: "0 masked, passed" },
    { title: "EDGE: a name with no label", why: "We only catch names that follow 'Patient:'. A bare name goes straight through.", question: "Jane Doe takes Cardioza, what is the dose?", expect: "0 masked, passed" },
    { title: "Reply with no citation", why: "This model gives the right fact but forgets the source tag. The output guardrail blocks it anyway. An uncited claim never goes out.", question: "Cardioza dose", flags: { model: "nocite" }, expect: "0 masked, blocked" },
    { title: "No approved source, so no citation", why: "The model refuses, and a refusal has no citation either. The guardrail blocks it. In lab 3 that sends it to a person.", question: "Zorbex dose", expect: "0 masked, blocked" },
    { title: "EDGE: wrong dose, valid citation", why: "The model says 20mg and cites the real document. A citation check cannot see that the claim is wrong. Only a check of the claim itself can. That is lab 4.", question: "Cardioza dose", flags: { model: "invent" }, expect: "0 masked, passed" },
  ],
  play(raw, flags) {
    const { clean, found } = redactPhi(raw);
    rule("INPUT GUARDRAIL");
    const spans = [];
    for (const item of found) {
      const start = raw.indexOf(item.text);
      spans.push({ start, end: start + item.text.length });
    }
    print(field("before", mark(raw, spans, (text) => bold(red(text))), dim, 8));
    print(field("after", highlight(clean), dim, 8));
    const labels = labelsOf(found).join(", ") || "nothing";
    print(field("caught", labels, found.length > 0 ? green : yellow, 8));

    const { answer } = runAgentLoop(clean, flags.country || "US", modelFrom(flags));
    rule("MODEL DRAFT");
    console.log(highlight(answer));

    rule("OUTPUT GUARDRAIL");
    const check = verifyOutput(answer, Object.keys(APPROVED_DOCS));
    if (check.ok) console.log(verdict.safe("Cites an approved source. Safe to send."));
    else console.log(verdict.blocked(check.reason));
    if (check.ok && flags.model === "invent") {
      box("LOOK CLOSER", [yellow("The guardrail passed, yet the dose is wrong. A citation is not proof.")], yellow);
    }
    return `${found.length} masked, ${check.ok ? "passed" : "blocked"}`;
  },
};

if (import.meta.main) runLab(lab);
