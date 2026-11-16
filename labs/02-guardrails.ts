// LAB 2: GUARDRAILS AND PHI REDACTION
//
// Read PART 1 (about 40 lines). Two guardrails wrap the model:
//   INPUT guardrail:  hide personal details BEFORE the model sees the note.
//   OUTPUT guardrail: block any reply that does not cite an approved document.
// PART 2 only prints the result in colour, so you can skip it.
//
// Run it:   bun labs/02-guardrails.ts            (menu of examples)
//           bun labs/02-guardrails.ts --demo     (every edge case, with a reason for each)

import { APPROVED_DOCS } from "../src/data";
import { modelFrom, runLab, type Lab } from "../src/runner";
import { bold, box, dim, field, green, highlight, mark, print, red, rule, verdict, yellow } from "../src/ui";
import { runAgentLoop } from "./01-agent-loop"; // the loop from lab 1

// ============================================================================
// PART 1: THE CORE LOGIC
// ============================================================================

// Each rule is a pattern to find, a name for it, and the token that replaces it.
// A pattern like \d{3}-\d{2}-\d{4} means "3 digits, a dash, 2 digits, a dash, 4 digits".
export const RULES = [
  { label: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g, token: "[SSN]" },
  { label: "email", pattern: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, token: "[EMAIL]" },
  { label: "phone", pattern: /\b(?:\+?\d{1,2}[ -])?\(?\d{3}\)?[ -]\d{3}[ -]\d{4}\b/g, token: "[PHONE]" },
  { label: "MRN", pattern: /\bMRN[:# ]*\d{5,}\b/gi, token: "[MRN]" },
  { label: "birth date", pattern: /\b(?:DOB|born)[:\s]+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/gi, token: "[DOB]" },
  { label: "patient name", pattern: /\bPatient:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g, token: "Patient: [NAME]" },
];

// INPUT GUARDRAIL: replace every sensitive piece with a token, and report what was found.
export function redactPhi(raw: string): { clean: string; found: string[] } {
  let clean = raw;
  const found: string[] = [];
  for (const rule of RULES) {
    const matches = clean.match(rule.pattern) ?? [];
    for (let i = 0; i < matches.length; i++) found.push(rule.label);
    clean = clean.replace(rule.pattern, rule.token);
  }
  return { clean, found };
}

// OUTPUT GUARDRAIL: the reply must cite at least one document, and every cited id must be a real approved one.
export type Check = { ok: true } | { ok: false; reason: string };

export function verifyOutput(draft: string, approvedIds: string[]): Check {
  const cited = [...draft.matchAll(/\[(DOC-\d+)\]/g)].map((match) => match[1]);
  if (cited.length === 0) return { ok: false, reason: "BLOCKED: no approved source citation." };
  const unknown = cited.filter((id) => !approvedIds.includes(id));
  if (unknown.length > 0) return { ok: false, reason: `BLOCKED: unknown source ${unknown.join(", ")}.` };
  return { ok: true };
}

// ============================================================================
// PART 2: HOW IT IS SHOWN (you can skip this)
// ============================================================================

export const lab2: Lab = {
  file: "02-guardrails.ts",
  title: "Lab 2: guardrails and PHI redaction",
  about:
    "Two guardrails around the model. The input guardrail masks personal and patient details on our side, before any model sees the note. The output guardrail refuses a reply that has no approved citation.",
  cases: [
    { title: "Name, social security number and phone", why: "The classic case. All three are masked, and the model only ever sees the tokens.", question: "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) on Cardioza dose", expect: "3 masked, passed" },
    { title: "Email, record number and birth date", why: "Other formats the input guardrail knows about.", question: "Cardioza dose for jane.doe@mail.com, MRN 1234567, DOB: 04/12/1980", expect: "3 masked, passed" },
    { title: "Nothing sensitive", why: "A clean question passes through unchanged. No false alarms.", question: "Cardioza dose", expect: "0 masked, passed" },
    { title: "EDGE: a number format we do not know", why: "The SSN has no dashes, so the pattern misses it and it stays in the note. This is the limit of pattern-based redaction. Real systems add a trained detector and a review step.", question: "Patient has SSN 123456789 and takes Cardioza, dose?", expect: "0 masked, passed" },
    { title: "EDGE: a name with no label", why: "We only catch names that follow 'Patient:'. A bare name goes straight through.", question: "Jane Doe takes Cardioza, what is the dose?", expect: "0 masked, passed" },
    { title: "Reply with no citation", why: "This model gives the right fact but forgets the source tag. The output guardrail blocks it anyway. An uncited claim never goes out.", question: "Cardioza dose", flags: { model: "nocite" }, expect: "0 masked, blocked" },
    { title: "No approved source, so no citation", why: "The model refuses, and a refusal has no citation either. The guardrail blocks it, which in lab 3 sends it to a person.", question: "Zorbex dose", expect: "0 masked, blocked" },
    { title: "EDGE: wrong dose, valid citation", why: "The model states 20mg and cites the real document. A citation check cannot see that the claim is wrong. Only a check of the claim itself can, which is lab 4.", question: "Cardioza dose", flags: { model: "invent" }, expect: "0 masked, passed" },
  ],
  play(raw, f) {
    const { clean, found } = redactPhi(raw);
    rule("INPUT GUARDRAIL");
    // Work out where each sensitive piece sits so we can colour it in the original text.
    const spans = RULES.flatMap((r) => [...raw.matchAll(r.pattern)].map((m) => ({ start: m.index!, end: m.index! + m[0].length })));
    print(field("before", mark(raw, spans, (s) => bold(red(s))), dim, 8));
    print(field("after", highlight(clean), dim, 8));
    print(field("caught", found.length ? found.join(", ") : "nothing", found.length ? green : yellow, 8));

    const { answer } = runAgentLoop(clean, f.country ?? "US", modelFrom(f));
    rule("MODEL DRAFT");
    console.log(highlight(answer));

    rule("OUTPUT GUARDRAIL");
    const check = verifyOutput(answer, Object.keys(APPROVED_DOCS));
    console.log(check.ok ? verdict.safe("Cites an approved source. Safe to send.") : verdict.blocked(check.reason));
    if (check.ok && f.model === "invent") box("LOOK CLOSER", [yellow("The guardrail passed, yet the dose is wrong. A citation is not proof.")], yellow);
    return `${found.length} masked, ${check.ok ? "passed" : "blocked"}`;
  },
};

if (import.meta.main) runLab(lab2);
