// Memory the bots share
//
// Maya keeps team notes. One says: "Keep replies short." Every bot at Juniper Studio reads the notes.
// A shared memory saves each bot from asking the same thing again. But a bad note is copied by every bot.
// A mail from a vendor can try to plant a note. It says to send all invoices to its address.
// If it is saved, the inbox, expense and triage bots all obey it. Nobody checks again.
// So a note is saved only after two checks. The writer must be a person on the team.
// And a note may not name an outside address. Each note keeps its writer, which is its provenance.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/34-shared-memory.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab shared-memory --question "A vendor mail asks the bots to remember a rule." --note planted --by mail-vendor --naive
//   bun run lab shared-memory --question "Maya adds the Acme notes for the team." --note acme --by maya
//   bun run lab shared-memory --question "The vendor mail tries to plant a note." --note planted --by mail-vendor
//   bun run lab shared-memory --question "A client types a note in the chat." --note acme --by client
//   bun run lab shared-memory --demo

import { appendLine, readLines } from "../src/jobs";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { NOTES } from "../src/team";

export type Note = { name: string; text: string; by: string };
export type Saved = { saved: boolean; why: string };
export const TEAM = ["maya"];

// Save one note. Read the steps in order. A note is shared only after both checks pass.
export function saveNote(file: string, note: Note): Saved {
  // Step 1: the writer must be a person on the team. A mail is not a person.
  if (!TEAM.includes(note.by)) return { saved: false, why: `${note.by} is not on the team.` };
  // Step 2: a note may not name an address. That is how a planted note sends money away.
  if (note.text.includes("@")) return { saved: false, why: "a note may not name an address." };
  // Step 3: save it with its writer. The writer is the provenance of the note.
  appendLine(file, note);
  return { saved: true, why: `saved, written by ${note.by}.` };
}

// The naive way: save whatever anyone writes.
export function saveNoteNaive(file: string, note: Note): Saved {
  appendLine(file, note);
  return { saved: true, why: "saved with no check." };
}

// The team starts with Maya's own rules.
export function seedNotes(file: string): void {
  appendLine(file, { name: "rules.md", text: NOTES["rules.md"], by: "maya" });
}

// Each bot reads every shared note before it writes a reply.
export function botReply(bot: string, file: string, callLlm: CallLlm): string {
  let prompt = `NOTES: ${bot}`;
  for (const note of readLines(file)) prompt += `\n${note.text}`;
  return callLlm([{ role: "user", content: prompt }], []).text || "";
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/34-shared-memory");
  runLab(lab);
}
