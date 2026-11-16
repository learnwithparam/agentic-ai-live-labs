// Finds private pieces in a note with regular expressions, the standard tool for ids that have a
// fixed shape. Lab 2 uses it. Each rule has a name, a token to put in its place, and a pattern.
// Names have no fixed shape. A name after "Patient:" is caught here. In production a trained
// detector such as Microsoft Presidio finds the rest, and its results go through this same step.

export type Rule = { label: string; token: string; pattern: RegExp };
export type Piece = { label: string; text: string; start: number; end: number };

export const RULES: Rule[] = [
  { label: "SSN", token: "[SSN]", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: "phone", token: "[PHONE]", pattern: /\b\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g },
  { label: "email", token: "[EMAIL]", pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { label: "MRN", token: "[MRN]", pattern: /\bMRN:?\s*\d{5,}\b/gi },
  { label: "birth date", token: "[DOB]", pattern: /\bDOB:?\s*\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi },
  { label: "patient name", token: "Patient: [NAME]", pattern: /\bPatient:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g },
];

// Every private piece in the text, in the order it appears.
export function findPrivate(text: string): Piece[] {
  const pieces: Piece[] = [];
  for (const rule of RULES) {
    for (const hit of text.matchAll(rule.pattern)) {
      const start = hit.index ?? 0;
      pieces.push({ label: rule.label, text: hit[0], start, end: start + hit[0].length });
    }
  }
  return pieces.sort((first, second) => first.start - second.start);
}

// The same text with each private piece swapped for its token.
export function hidePrivate(text: string): { clean: string; found: Piece[] } {
  const found = findPrivate(text);
  let clean = text;
  for (const rule of RULES) clean = clean.replace(rule.pattern, rule.token);
  return { clean, found };
}
