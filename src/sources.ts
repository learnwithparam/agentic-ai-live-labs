// The three sources of facts on the shelf in lab 13.

import { APPROVED_DOCS, EMAILS } from "./data";
import type { Source } from "../labs/13-pick-context";

function allDocuments(): string {
  const lines: string[] = [];
  for (const id in APPROVED_DOCS) lines.push(`[${id}] ${APPROVED_DOCS[id].text}`);
  return "APPROVED DOCUMENTS:\n" + lines.join("\n");
}

export const SOURCES: Source[] = [
  { name: "documents", keywords: ["dose", "side effect", "storage", "label"], text: allDocuments() },
  { name: "profile", keywords: ["my profile", "who am i", "my specialty"], text: "DOCTOR PROFILE: Dr. Lee, US, cardiology. Prefers short emails." },
  { name: "emails", keywords: ["email", "sent", "received", "outreach"], text: "RECENT EMAILS:\n" + EMAILS["H-1"].join("\n") },
];
