// Reads the English inside code: comments, and the text fields a learner sees on screen.
// It uses the same grade 6 rules as the pages (scripts/plain-english.ts).
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { problemsIn, readingGrade, sentencesOf } from "./plain-english";

const ROOT = process.cwd();
const FOLDERS = ["labs", "show", "src"];
const FIELDS = ["about", "terms", "challenge", "promise", "production", "why", "title"];

function isCommand(line: string): boolean {
  const text = line.replace("//", "").trim();
  const isMarker = text.startsWith("LAB ") || text.startsWith("PART ");
  return isMarker || text.startsWith("bun ") || text.startsWith("Run it");
}

// Comment lines become paragraphs. A blank comment line ends a paragraph.
function commentText(code: string): string {
  const paragraphs: string[] = [""];
  for (const line of code.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("//") || isCommand(trimmed)) {
      if (paragraphs[paragraphs.length - 1] !== "") paragraphs.push("");
      continue;
    }
    const text = trimmed.replace("//", "").trim();
    if (text === "") paragraphs.push("");
    else paragraphs[paragraphs.length - 1] += `${text} `;
  }
  return paragraphs.join("\n\n");
}

// Text fields such as about: "..." that a learner reads on screen.
function fieldText(code: string): string {
  const found: string[] = [];
  const joined = code.replace(/(\w+):\s*\n\s*"/g, '$1: "');
  for (const line of joined.split("\n")) {
    for (const name of FIELDS) {
      const start = line.indexOf(`${name}: "`);
      if (start < 0) continue;
      const rest = line.slice(start + name.length + 3);
      found.push(rest.slice(0, rest.indexOf('",')));
    }
  }
  return found.join("\n\n");
}

function codeFiles(): string[] {
  const files: string[] = [];
  for (const folder of FOLDERS) {
    for (const name of readdirSync(join(ROOT, folder))) {
      if (name.endsWith(".ts")) files.push(join(ROOT, folder, name));
    }
  }
  return files;
}

const EMPTY_PHRASES = ["whole idea", "top to bottom", "skim", "helpers", "core logic"];

// Shouting and empty talk say nothing. A comment says what the next lines do.
function styleProblems(code: string): string[] {
  const found: string[] = [];
  for (const line of code.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("//") || isCommand(trimmed)) continue;
    const text = trimmed.replace("//", "").trim();
    const letters = text.replace(/[^A-Za-z]/g, "");
    const shouting = letters.length > 8 && letters === letters.toUpperCase();
    const allowed = text.startsWith("LAB ") || text.startsWith("PART ");
    if (shouting && !allowed) found.push(`shouting comment "${text}": write a plain sentence`);
    for (const phrase of EMPTY_PHRASES) {
      if (text.toLowerCase().includes(phrase)) found.push(`empty phrase "${phrase}" in "${text}"`);
    }
  }
  return found;
}

// Every block is graded alone, so one hard block cannot hide inside an easy file.
function blockProblems(text: string): string[] {
  const found: string[] = [];
  for (const block of text.split("\n\n")) {
    const sentences = sentencesOf(block);
    if (sentences.length === 0) continue;
    const grade = readingGrade(sentences);
    if (grade > 6.5) found.push(`grade ${grade.toFixed(1)} block "${block.trim().slice(0, 50)}..."`);
  }
  return found;
}

const problems: string[] = [];
for (const file of codeFiles()) {
  const code = readFileSync(file, "utf8");
  for (const message of styleProblems(code)) problems.push(`${relative(ROOT, file)}: ${message}`);
  for (const message of blockProblems(commentText(code))) {
    problems.push(`${relative(ROOT, file)}: ${message}`);
  }
  const text = `${commentText(code)}\n\n${fieldText(code)}`;
  for (const problem of problemsIn(file, text, 6)) {
    problems.push(`${relative(ROOT, file)}: ${problem.message}`);
  }
}
for (const problem of problems) console.error(problem);
if (problems.length > 0) {
  console.error(`${problems.length} code-English problems. Comments and screen text must be grade 6.`);
  process.exit(1);
}
console.log("Every code comment and screen text reads at grade 6 or below.");
