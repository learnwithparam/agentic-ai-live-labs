// bun run distinct: no two labs tell the same story, and every id is a readable name.
//
// Checks:
//   D1  no two labs open on the same first question
//   D2  no lab text holds an opaque id such as H-1 or DOC-101
//   D3  every lab says what it becomes in production
import { readdirSync, readFileSync } from "node:fs";
import type { Lab } from "../src/runner";

// These look like ids but are not. They are tokens and chunk numbers the labs teach on purpose.
const ALLOWED = ["SSN-1", "R-7", "C-1", "C-2", "C-3", "C-4", "C-5", "C-6", "PHI-1", "PHI-2"];
const OPAQUE = /\b[A-Z]{1,3}-\d+\b/g;

export function opaqueIds(text: string): string[] {
  const found: string[] = [];
  for (const id of text.match(OPAQUE) ?? []) if (!ALLOWED.includes(id)) found.push(id);
  return found;
}

const problems: string[] = [];
const opening: Record<string, string> = {};
for (const file of readdirSync("show").sort()) {
  const { lab }: { lab: Lab } = await import(`../show/${file}`);
  const first = lab.cases[0]?.question ?? "";
  if (opening[first] !== undefined) problems.push(`D1 ${file} opens like ${opening[first]}: "${first}"`);
  if (first !== "") opening[first] = file;
  for (const id of opaqueIds(readFileSync(`show/${file}`, "utf8"))) problems.push(`D2 ${file}: opaque id ${id}`);
  if (!lab.production) problems.push(`D3 ${file}: no production line`);
}
for (const file of readdirSync("labs").sort()) {
  for (const id of opaqueIds(readFileSync(`labs/${file}`, "utf8"))) problems.push(`D2 ${file}: opaque id ${id}`);
}
if (import.meta.main) {
  for (const line of problems) console.log(line);
  if (problems.length > 0) {
    console.log(`${problems.length} distinct problems.`);
    process.exit(1);
  }
  console.log("Every lab opens on its own question, and every id is a readable name.");
}
