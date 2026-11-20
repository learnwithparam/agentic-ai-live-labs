// The check the reflect and fix lab runs on every draft: a citation, and only doses the document has.

// A real model adds stars, odd hyphens and spaces. Take them out before checking.
function tidy(text: string): string {
  const plain = text.replaceAll("*", "").replaceAll("\u2011", "-");
  return plain.replaceAll("\u00a0", " ").replaceAll("\u202f", " ").replaceAll(" mg", "mg");
}

// List what is wrong with a draft. An empty list means the draft is good.
export function findProblems(draft: string, source: string): string[] {
  const problems: string[] = [];
  const text = tidy(draft);
  if (!/\[[A-Z]+-[A-Z]+\]/.test(text)) problems.push("no citation");
  for (const dose of dosesIn(text)) {
    if (!dosesIn(source).includes(dose)) problems.push(`dose ${dose} is not in the source`);
  }
  return problems;
}

// Every dose in a text. "Take 10mg daily." gives ["10mg"].
export function dosesIn(text: string): string[] {
  const found: string[] = [];
  for (const word of text.split(" ")) {
    const clean = word.replaceAll(".", "").replaceAll(",", "");
    if (clean.endsWith("mg")) found.push(clean);
  }
  return found;
}
