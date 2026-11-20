// Notes on disk for the context budget lab. A big tool result is saved here in full.
// The prompt gets a one-line receipt. The full text is read back only when a question needs it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

export function notesDir(): string {
  return process.env.NOTES_DIR || ".notes";
}

export function saveNote(name: string, text: string): void {
  mkdirSync(notesDir(), { recursive: true });
  writeFileSync(`${notesDir()}/${name}.txt`, text);
}

export function readNote(name: string): string {
  return readFileSync(`${notesDir()}/${name}.txt`, "utf8");
}
