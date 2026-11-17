// The schema for the tool schema lab, and the small safe fixes the check can make.
// You do not need to read this file to learn the lab. The check itself is in labs/05-tool-schemas.ts.
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
export function reject(note: string): Verdict {
  return { status: "rejected", args: {}, notes: [note] };
}

// Fix a field if the fix is obvious and safe. Otherwise return the value unchanged.
export function tidy(field: Field, value: unknown, notes: string[]): unknown {
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

export function isInSchema(name: string, schema: Field[]): boolean {
  for (const field of schema) {
    if (field.name === name) return true;
  }
  return false;
}

