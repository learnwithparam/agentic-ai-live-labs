import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { readLines } from "../../src/jobs";
import { makeModel } from "../../src/model";
import { NOTES, PLANTED_NOTE } from "../../src/team";
import { botReply, saveNote, saveNoteNaive, seedNotes } from "../../labs/34-shared-memory";

const fresh = () => {
  const file = `${mkdtempSync(`${tmpdir()}/t34-`)}/memory.jsonl`;
  seedNotes(file);
  return file;
};
const ok = makeModel("ok");
const acme = { name: "clients/acme.md", text: NOTES["clients/acme.md"], by: "maya" };
const planted = { name: "new.md", text: PLANTED_NOTE, by: "mail-vendor" };

// PROMISE: only a note from the team that names no address is saved. Each note keeps its writer.
test("Maya's note is saved with her name and every bot uses it", () => {
  const file = fresh();
  expect(saveNote(file, acme).saved).toBe(true);
  expect(readLines(file)[1].by).toBe("maya");
  for (const bot of ["inbox", "expense", "triage"]) {
    expect(botReply(bot, file, ok)).toContain("The deadline is Friday.");
  }
});

test("a note planted by a mail is not saved and no bot obeys it", () => {
  const file = fresh();
  expect(saveNote(file, planted).saved).toBe(false);
  expect(readLines(file).length).toBe(1);
  expect(botReply("expense", file, ok)).not.toContain("stock-photos");
});

test("without the checks every bot obeys the planted note", () => {
  const file = fresh();
  saveNoteNaive(file, planted);
  expect(botReply("inbox", file, ok)).toContain("stock-photos");
  expect(botReply("triage", file, ok)).toContain("stock-photos");
});

test("a clean note from a writer outside the team is refused", () => {
  const file = fresh();
  const result = saveNote(file, { ...acme, by: "client" });
  expect(result.saved).toBe(false);
  expect(result.why).toContain("not on the team");
});

test("a note from Maya that names an address is refused", () => {
  const file = fresh();
  const result = saveNote(file, { ...planted, by: "maya" });
  expect(result.saved).toBe(false);
  expect(result.why).toContain("address");
});

test("the shared rule keeps replies short", () => {
  const reply = botReply("inbox", fresh(), ok);
  expect(reply).not.toContain("full details");
});
