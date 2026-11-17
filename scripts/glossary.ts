// bun run glossary: every new word is defined once, in plain words, and used in its lab.
//
// Checks, with the rule number in each message:
//   G1  every id a lab lists exists in src/glossary.ts
//   G2  every glossary entry is used by at least one lab
//   G3  one word, one meaning: no word is defined twice
//   G4  a meaning is at most 2 sentences of 18 words or fewer, at grade 6 or below
//   G5  a lab lists 2 to 5 different words
//   G6  each word of a lab appears in its lesson text, not only in the list
import { existsSync, readdirSync } from "node:fs";
import { GLOSSARY } from "../src/glossary";
import { pageFor } from "./readme";
import { readingGrade, sentencesOf } from "./plain-english";
import type { Lab } from "../src/runner";

const MOST_WORDS_IN_SENTENCE = 18;
const MOST_SENTENCES = 2;
const GRADE_LIMIT = 6;
const FEWEST_WORDS = 2;
const MOST_WORDS = 5;

export function meaningProblems(id: string, meaning: string): string[] {
  const found: string[] = [];
  const sentences = sentencesOf(meaning);
  if (sentences.length > MOST_SENTENCES) found.push(`G4 "${id}": ${sentences.length} sentences; keep to ${MOST_SENTENCES}`);
  for (const sentence of sentences) {
    const count = sentence.split(/\s+/).length;
    if (count > MOST_WORDS_IN_SENTENCE) found.push(`G4 "${id}": ${count}-word sentence; keep to ${MOST_WORDS_IN_SENTENCE}`);
  }
  const grade = readingGrade(sentences);
  if (sentences.length > 0 && grade > GRADE_LIMIT) found.push(`G4 "${id}": grade ${grade.toFixed(1)}; keep to ${GRADE_LIMIT}`);
  if (/[;—]/.test(meaning)) found.push(`G4 "${id}": no semicolons or em dashes`);
  return found;
}

// The page without its "New words" list, so a word must be used in the lesson itself.
export function lessonOf(page: string): string {
  const start = page.indexOf("## New words");
  if (start < 0) return page;
  const next = page.indexOf("\n## ", start + 1);
  return page.slice(0, start) + (next < 0 ? "" : page.slice(next));
}

// The picture is drawn from the same words, so its labels do not count as lesson text.
export function withoutPicture(page: string): string {
  const start = page.indexOf("## The story in one picture");
  if (start < 0) return page;
  const next = page.indexOf("\n## ", start + 1);
  return page.slice(0, start) + (next < 0 ? "" : page.slice(next));
}

export function glossaryProblems(labs: { file: string; lab: Lab }[]): string[] {
  const found: string[] = [];
  const used = new Set<string>();
  const seen = new Map<string, string>();

  for (const [id, entry] of Object.entries(GLOSSARY)) {
    const key = entry.word.toLowerCase();
    if (seen.has(key)) found.push(`G3 "${entry.word}" is defined twice: "${seen.get(key)}" and "${id}"`);
    seen.set(key, id);
    found.push(...meaningProblems(id, entry.meaning));
  }

  for (const { file, lab } of labs) {
    const ids = lab.terms ?? [];
    if (ids.length < FEWEST_WORDS || ids.length > MOST_WORDS) found.push(`G5 ${file}: lists ${ids.length} words; keep to ${FEWEST_WORDS} to ${MOST_WORDS}`);
    if (new Set(ids).size !== ids.length) found.push(`G5 ${file}: lists a word twice`);
    const page = pageFor(file, lab);
    const lessonText = withoutPicture(lessonOf(page)).toLowerCase();
    for (const id of ids) {
      used.add(id);
      const entry = GLOSSARY[id];
      if (!entry) {
        found.push(`G1 ${file}: "${id}" is not in src/glossary.ts`);
        continue;
      }
      if (!lessonText.includes(entry.word.toLowerCase())) {
        found.push(`G6 ${file}: "${entry.word}" is listed but never used in the lesson text`);
      }
    }
  }

  for (const id of Object.keys(GLOSSARY)) {
    if (!used.has(id)) found.push(`G2 "${id}" is in src/glossary.ts but no lab uses it`);
  }
  return found;
}

export async function loadLabs(): Promise<{ file: string; lab: Lab }[]> {
  const labs: { file: string; lab: Lab }[] = [];
  for (const file of readdirSync("labs").sort()) {
    if (!/^\d\d-.*\.ts$/.test(file)) continue;
    const place = existsSync(`show/${file}`) ? "show" : "labs";
    const loaded = (await import(`../${place}/${file}`)) as { lab: Lab };
    labs.push({ file, lab: loaded.lab });
  }
  return labs;
}

if (import.meta.main) {
  const problems = glossaryProblems(await loadLabs());
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) {
    console.error(`${problems.length} glossary problems.`);
    process.exit(1);
  }
  console.log(`Every new word is defined once, in plain words, and used in its lab (${Object.keys(GLOSSARY).length} words).`);
}
