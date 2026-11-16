// Input guardrail: personal and patient details are masked on our side, before any model sees the text.
// Output guardrail: a reply with no approved citation never goes out.

const RULES: { label: string; pattern: RegExp; token: string }[] = [
  { label: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g, token: "[SSN]" },
  { label: "email", pattern: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, token: "[EMAIL]" },
  { label: "phone", pattern: /\b(?:\+?\d{1,2}[ -])?\(?\d{3}\)?[ -]\d{3}[ -]\d{4}\b/g, token: "[PHONE]" },
  { label: "MRN", pattern: /\bMRN[:# ]*\d{5,}\b/gi, token: "[MRN]" },
  { label: "birth date", pattern: /\b(?:DOB|born)[:\s]+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/gi, token: "[DOB]" },
  { label: "patient name", pattern: /\bPatient:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g, token: "Patient: [NAME]" },
];

export type Redaction = { clean: string; found: string[] };

export function redactPhi(raw: string): Redaction {
  let clean = raw;
  const found: string[] = [];
  for (const rule of RULES) {
    const hits = clean.match(rule.pattern);
    if (!hits) continue;
    found.push(...hits.map(() => rule.label));
    clean = clean.replace(rule.pattern, rule.token);
  }
  return { clean, found };
}

export type Verdict = { ok: true; reply: string } | { ok: false; reason: string };

export function verifyOutput(draft: string, validIds: Set<string>): Verdict {
  const cited = [...draft.matchAll(/\[(DOC-\d+)\]/g)].map((m) => m[1]);
  if (cited.length === 0) return { ok: false, reason: "BLOCKED: no approved source citation." };
  const bad = cited.filter((id) => !validIds.has(id));
  if (bad.length > 0) return { ok: false, reason: `BLOCKED: unknown source ${bad.join(", ")}.` };
  return { ok: true, reply: draft };
}
