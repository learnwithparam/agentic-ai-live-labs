// The noisy search for lab 32. It returns the real approved hits, then a long pile of old notes.
// Real document stores do this: the answer is in there, with pages of old drafts around it.
import { searchApprovedDocs } from "../labs/01-agent-loop";
import { NO_DOC } from "./data";
import type { ToolInput } from "./model";

export const OLD_NOTES: string[] = [];
for (let number = 1; number <= 40; number++) {
  const dose = 10 + number;
  OLD_NOTES.push(
    `Old draft ${number} (not approved, do not use): label text for Cardioza proposed ${dose}mg for some patients.`,
  );
}

export function searchWithArchive(input: ToolInput): string {
  const hits = searchApprovedDocs(input.query, input.country);
  if (hits === NO_DOC) return hits;
  return `${hits}\n${OLD_NOTES.join("\n")}`;
}
