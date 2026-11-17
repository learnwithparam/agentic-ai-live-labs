// Finds private pieces in a note with regular expressions. They suit ids that have a fixed shape.
// The guardrails lab uses it. Each rule has a name, a token to put in its place, and a pattern.
// Names have no fixed shape. A rule catches a name after "Patient:".
// A language library, compromise, finds the other names. A doctor's name stays.

import nlp from "compromise";

export type Rule = { label: string; token: string; pattern: RegExp };
export type Piece = { label: string; token: string; text: string; start: number; end: number };

export const RULES: Rule[] = [
  { label: "SSN", token: "[SSN]", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: "SSN", token: "[SSN]", pattern: /\bSSN:?\s*\d{9}\b/gi },
  { label: "phone", token: "[PHONE]", pattern: /\b\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g },
  { label: "email", token: "[EMAIL]", pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { label: "MRN", token: "[MRN]", pattern: /\bMRN:?\s*\d{5,}\b/gi },
  { label: "birth date", token: "[DOB]", pattern: /\bDOB:?\s*\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi },
  { label: "patient name", token: "Patient: [NAME]", pattern: /\bPatient:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g },
];

// A name after "Dr." is the doctor. The doctor is not the patient, so the name stays.
function isDoctor(name: string): boolean {
  return name.startsWith("Dr.") || name.startsWith("Dr ");
}

// Names have no fixed shape. A language library, compromise, finds them in any place.
function findNames(text: string, taken: Piece[]): Piece[] {
  const pieces: Piece[] = [];
  for (const found of nlp(text).people().out("array")) {
    const name = found.replace(/[,.;:]+$/, "").trim();
    const start = text.indexOf(name);
    if (start < 0 || isDoctor(name)) continue;
    const end = start + name.length;
    const overlaps = taken.some((piece) => start < piece.end && end > piece.start);
    if (!overlaps) pieces.push({ label: "patient name", token: "[NAME]", text: name, start, end });
  }
  return pieces;
}

// Every private piece in the text, in the order it appears.
export function findPrivate(text: string): Piece[] {
  const pieces: Piece[] = [];
  for (const rule of RULES) {
    for (const hit of text.matchAll(rule.pattern)) {
      const start = hit.index ?? 0;
      pieces.push({ label: rule.label, token: rule.token, text: hit[0], start, end: start + hit[0].length });
    }
  }
  pieces.push(...findNames(text, pieces));
  return pieces.sort((first, second) => first.start - second.start);
}

// The same text with each private piece swapped for its token.
export function hidePrivate(text: string): { clean: string; found: Piece[] } {
  const found = findPrivate(text);
  let clean = text;
  for (const piece of [...found].reverse()) {
    clean = clean.slice(0, piece.start) + piece.token + clean.slice(piece.end);
  }
  return { clean, found };
}
