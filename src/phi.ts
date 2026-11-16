// Finds private pieces in a note, one word at a time: a social number, a phone, an email,
// a record number, a birth date, or a name after "Patient:". Lab 2 uses it.

function isDigits(text: string): boolean {
  if (text.length === 0) return false;
  for (const letter of text) {
    if (!"0123456789".includes(letter)) return false;
  }
  return true;
}

// True if the word is digit groups split by a symbol, like 123-45-6789 (sizes 3, 2, 4).
function hasShape(word: string, symbol: string, sizes: number[]): boolean {
  const groups = word.split(symbol);
  if (groups.length !== sizes.length) return false;
  for (let index = 0; index < sizes.length; index++) {
    if (groups[index].length !== sizes[index]) return false;
    if (!isDigits(groups[index])) return false;
  }
  return true;
}

function isDate(word: string): boolean {
  return word.split("/").length === 3 && isDigits(word.replaceAll("/", ""));
}

function isEmail(word: string): boolean {
  const parts = word.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1].includes(".");
}

// A name word starts with a capital and is lowercase after that, like Jane.
function isNameWord(word: string): boolean {
  if (word.length < 2) return false;
  return word === word[0].toUpperCase() + word.slice(1).toLowerCase();
}

// Split "(123-45-6789)," into the symbols in front, the word, and the symbols behind.
export function splitSymbols(word: string): { before: string; core: string; after: string } {
  let start = 0;
  let end = word.length;
  while (start < end && "(\"'".includes(word[start])) start++;
  while (end > start && ".,;)?!\"'".includes(word[end - 1])) end--;
  return { before: word.slice(0, start), core: word.slice(start, end), after: word.slice(end) };
}

export type Spot = { label: string; token: string; used: number };

function coreOf(words: string[], position: number): string {
  if (position >= words.length) return "";
  return splitSymbols(words[position]).core;
}

// Count the name words in a row, starting at position.
function countNameWords(words: string[], position: number): number {
  let count = 0;
  while (isNameWord(coreOf(words, position + count))) count++;
  return count;
}

// Look at the words from position on. If they start a private piece, say what it is.
// "used" is how many words the piece takes up.
export function spotPrivate(words: string[], position: number): Spot | null {
  const word = coreOf(words, position);
  const next = coreOf(words, position + 1);
  const letters = word.replace(":", "").toUpperCase();

  if (hasShape(word, "-", [3, 2, 4])) return { label: "SSN", token: "[SSN]", used: 1 };
  if (hasShape(word, "-", [3, 3, 4])) return { label: "phone", token: "[PHONE]", used: 1 };
  if (isEmail(word)) return { label: "email", token: "[EMAIL]", used: 1 };
  if (letters === "MRN" && isDigits(next) && next.length >= 5) {
    return { label: "MRN", token: "[MRN]", used: 2 };
  }
  if (letters === "DOB" && isDate(next)) return { label: "birth date", token: "[DOB]", used: 2 };
  if (word === "Patient:" && countNameWords(words, position + 1) >= 2) {
    const nameWords = countNameWords(words, position + 1);
    return { label: "patient name", token: "Patient: [NAME]", used: 1 + nameWords };
  }
  return null;
}

