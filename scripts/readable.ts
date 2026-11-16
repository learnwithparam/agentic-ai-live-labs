// bun run readable: the labs must read like plain English.
//
// A lab file has two parts. PART 1 is the idea a learner reads. It may only use simple syntax.
// PART 2 draws the colour output and is free to use more.
// Names must be whole words everywhere. Sentences must be short everywhere.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LONGEST_LINE = 100;
const MOST_CALLS_IN_ONE_LINE = 3;
const LONGEST_SENTENCE = 25;
const LONGEST_PART_ONE = 150;

const SHORT_NAMES_THAT_ARE_FINE = ["i", "id", "ok", "ui"];
const ABBREVIATIONS = ["ctx", "cfg", "tmp", "res", "req", "resp", "obj", "arr", "val", "str", "num"];
const ABBREVIATIONS_2 = ["idx", "cnt", "msg", "fn", "cb", "evt", "buf", "acc", "elem", "mgr", "svc"];

// Syntax PART 1 may not use, with the plain way to write it.
const BANNED_IN_PART_ONE = [
  { pattern: /\.(match|matchAll)\(/, use: "a loop over words, not a regex" },
  { pattern: /\.replace\(\//, use: "a loop over words, not a regex" },
  { pattern: /\?\./, use: "an if statement, not ?." },
  { pattern: /\?\?/, use: "an if statement, not ??" },
  { pattern: /\.\.\.\w/, use: "a for loop, not spread" },
  { pattern: /\.(map|filter|reduce|flatMap|forEach)\(/, use: "a for loop" },
  { pattern: /=>/, use: "a named function" },
  { pattern: /Object\.entries/, use: "for (const id in object)" },
  { pattern: /\s\?\s/, use: "if and else, not a ternary" },
];

const HARD_WORDS = ["utilize", "facilitate", "commence", "subsequently", "approximately", "prior to"];

export type Problem = { file: string; line: number; message: string };

// Remove the text inside quotes so a "?" in a message is not mistaken for code.
function withoutStrings(line: string): string {
  return line
    .replace(/`(?:[^`\\]|\\.)*`/g, "``")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

function isComment(line: string): boolean {
  return line.trim().startsWith("//");
}

function namesDeclaredOn(line: string): string[] {
  const names: string[] = [];
  const patterns = [
    /\b(?:const|let|function|type)\s+([A-Za-z_$][\w$]*)/g,
    /\bfor\s*\((?:const|let)\s+([A-Za-z_]\w*)\s+(?:in|of)\b/g,
    /\(([A-Za-z_$][\w$]*)\)\s*=>/g,
  ];
  for (const pattern of patterns) {
    for (const match of line.matchAll(pattern)) names.push(match[1]);
  }
  return names;
}

function nameProblem(name: string): string | undefined {
  if (ABBREVIATIONS.includes(name) || ABBREVIATIONS_2.includes(name)) {
    return `"${name}" is an abbreviation; write the whole word`;
  }
  if (name.length <= 2 && !SHORT_NAMES_THAT_ARE_FINE.includes(name)) {
    return `"${name}" is too short; name what it holds in a whole word`;
  }
  return undefined;
}

function sentenceProblems(text: string): string[] {
  const problems: string[] = [];
  for (const sentence of text.split(/[.!?:]\s/)) {
    const words = sentence.split(/\s+/).filter((word) => word.length > 0);
    if (words.length > LONGEST_SENTENCE) {
      problems.push(`sentence has ${words.length} words; keep it under ${LONGEST_SENTENCE + 1}`);
    }
  }
  for (const word of HARD_WORDS) {
    if (text.toLowerCase().includes(word)) problems.push(`"${word}" is a hard word; use a simpler one`);
  }
  return problems;
}

// The words a learner reads: comments, and the why / about texts of the examples.
function proseOn(line: string): string {
  if (isComment(line)) return line.trim().slice(2).trim();
  const quoted = line.match(/\b(?:why|about):\s*"((?:[^"\\]|\\.)*)"/g) || [];
  return quoted.join(" ");
}

export function problemsIn(file: string, text: string): Problem[] {
  const problems: Problem[] = [];
  const lines = text.split("\n");
  const partTwo = lines.findIndex((line) => line.startsWith("// PART 2:"));
  const partOne = lines.findIndex((line) => line.startsWith("// PART 1:"));
  const isLab = partOne >= 0;
  const add = (index: number, message: string) => problems.push({ file, line: index + 1, message });

  if (isLab && partTwo < 0) add(0, "a lab needs a // PART 2: line");
  if (isLab && partTwo - partOne > LONGEST_PART_ONE) add(partOne, `PART 1 is over ${LONGEST_PART_ONE} lines`);

  for (const [index, line] of lines.entries()) {
    const inPartOne = isLab && index > partOne && index < partTwo;
    for (const message of sentenceProblems(proseOn(line))) add(index, message);
    if (isComment(line)) continue;
    const code = withoutStrings(line);
    for (const name of namesDeclaredOn(code)) {
      const message = nameProblem(name);
      if (message) add(index, message);
    }
    if (!inPartOne) continue;
    if (line.length > LONGEST_LINE) add(index, `line is ${line.length} characters; keep it under ${LONGEST_LINE + 1}`);
    if ((code.match(/\.\w+\(/g) || []).length > MOST_CALLS_IN_ONE_LINE) add(index, "too many steps on one line");
    for (const banned of BANNED_IN_PART_ONE) {
      if (banned.pattern.test(code)) add(index, `not allowed in PART 1; use ${banned.use}`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const folders = ["labs", "src", "scripts"];
  const problems: Problem[] = [];
  for (const folder of folders) {
    for (const name of readdirSync(folder)) {
      if (!name.endsWith(".ts")) continue;
      const path = join(folder, name);
      problems.push(...problemsIn(path, readFileSync(path, "utf8")));
    }
  }
  for (const problem of problems) console.error(`${problem.file}:${problem.line}: ${problem.message}`);
  if (problems.length > 0) {
    console.error(`${problems.length} readability problems.`);
    process.exit(1);
  }
  console.log("The labs read like plain English.");
}
