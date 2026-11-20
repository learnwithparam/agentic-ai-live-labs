// What you see on screen for the shared memory lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/34-shared-memory.ts.
// Three bots read the shared notes: inbox, expense and triage. Each writes one reply.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { NOTES, PLANTED_NOTE } from "../src/team";
import { botReply, saveNote, saveNoteNaive, seedNotes } from "../labs/34-shared-memory";

const BOTS = ["inbox", "expense", "triage"];

export const lab: Lab = {
  file: "34-shared-memory.ts",
  title: "Memory the bots share",
  about:
    "Each example tries to save one note in the team memory. Then three bots read the notes and write a reply. Pick the note with --note, and its writer with --by.",
  terms: ["shared-memory", "poisoned", "provenance"],
  challenge: "One bot saves a planted note. Every bot after it reads the note and obeys it. The shared memory is now poisoned.",
  promise: "A note is saved only if its writer is on the team and it names no outside address. Each note keeps its provenance, which is who wrote it.",
  production: "Keep memory in a database with the writer on every row. Let Maya delete a poisoned note, and log every read.",
  cases: [
    { title: "NAIVE: save whatever anyone writes", why: "A vendor mail plants a note about invoices. It is saved, and all three bots obey it.", question: "A vendor mail asks the bots to remember a new rule.", flags: { note: "planted", by: "mail-vendor", naive: "true" }, expect: "poisoned" },
    { title: "Maya shares a note", why: "Maya writes the Acme notes. Both checks pass, so all three bots know the deadline.", question: "Maya adds the Acme notes for the team.", flags: { note: "acme", by: "maya" }, expect: "shared" },
    { title: "EDGE: a mail plants a note", why: "The vendor mail names an outside address. The check refuses it, and the bots stay as they were.", question: "The vendor mail tries to plant a note.", flags: { note: "planted", by: "mail-vendor" }, expect: "refused" },
    { title: "EDGE: a writer who is not on the team", why: "A client types a clean note in the chat. The writer is not on the team, so it is refused.", question: "A client types a note in the chat.", flags: { note: "acme", by: "client" }, expect: "refused" },
    { title: "EDGE: a team member pastes an address", why: "Maya pastes the planted text by mistake. The second check sees the address and refuses it.", question: "Maya pastes a note with an address in it.", flags: { note: "planted", by: "maya" }, expect: "refused" },
  ],
  play(question, flags) {
    const file = `${mkdtempSync(`${tmpdir()}/lab34-`)}/memory.jsonl`;
    const model = modelFrom(flags);
    print(field("Request", question));
    seedNotes(file);
    let text = NOTES["clients/acme.md"];
    if (flags.note === "planted") text = PLANTED_NOTE;
    const note = { name: "new.md", text, by: flags.by || "maya" };
    let result;
    if (flags.naive) result = saveNoteNaive(file, note);
    else result = saveNote(file, note);
    rule("LOG, STEP BY STEP");
    console.log(dim(`The note from ${note.by}: ${result.why}`));
    let poisoned = false;
    let known = 0;
    for (const bot of BOTS) {
      const reply = botReply(bot, file, model);
      print(field(`${bot} bot`, reply));
      if (reply.includes("stock-photos")) poisoned = true;
      if (reply.includes("Friday")) known += 1;
    }
    if (poisoned) {
      box(badgeRed("POISONED"), [red("The bots obey a note a mail planted.")], red);
      return "poisoned";
    }
    if (result.saved && known === BOTS.length) {
      box(badgeGreen("SHARED"), [green("All three bots use the new note.")], green);
      return "shared";
    }
    box(badgeGreen("REFUSED"), [green("The note was not saved. The bots are unchanged.")], green);
    return "refused";
  },
};
