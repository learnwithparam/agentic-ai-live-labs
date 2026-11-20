// The three sources of facts on the shelf in the picking context lab.

import { APPROVED_DOCS, EMAILS } from "./data";
import type { Source } from "../labs/13-pick-context";

function allDocuments(): string {
  const lines: string[] = [];
  for (const id in APPROVED_DOCS) lines.push(`[${id}] ${APPROVED_DOCS[id].text}`);
  return "APPROVED DOCUMENTS:\n" + lines.join("\n");
}

export const SOURCES: Source[] = [
  { name: "documents", about: "approved drug documents: dose, side effects, storage, label", text: allDocuments() },
  { name: "profile", about: "the doctor profile: who they are, their specialty, how they like emails", text: "DOCTOR PROFILE: Dr. Lee, US, cardiology. Prefers short emails." },
  { name: "emails", about: "recent emails sent to and from the doctor", text: "RECENT EMAILS:\n" + EMAILS["dr-lee"].join("\n") },
];
