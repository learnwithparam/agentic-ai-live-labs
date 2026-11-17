// bun scripts/readme.ts --write   writes docs/labs/*.md, one page per lab, and the lab index in README.md
// bun scripts/readme.ts --check   fails if a page or the README index is missing or out of date (bun run check runs this)
//
// The page is made from the lab's own words (about, terms, challenge, promise, production, cases)
// and its picture in src/pictures.ts, so it cannot drift from the code. Nobody writes these by hand.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { GLOSSARY, type Word } from "../src/glossary";
import { PICTURES } from "../src/pictures";
import { STUCK } from "../src/stuck";
import { LABS, TRACKS, slugFromFile } from "../src/roadmap";
import { shellWord } from "../src/runner";
import type { Case, Lab } from "../src/runner";
import { labFile } from "./path";

const FOLDER = "docs/labs";
const README = "README.md";
const INDEX_START = "<!-- AUTO_LAB_INDEX_START -->";
const INDEX_END = "<!-- AUTO_LAB_INDEX_END -->";

function cell(text: string): string {
  return text.replaceAll("|", "/").replaceAll("\n", " ");
}

// The command that runs one case by itself. It uses the concept name, so it never goes stale.
export function commandFor(file: string, item: Case): string {
  const name = slugFromFile(file);
  if (item.question.length > 50) return `bun run lab ${name} --demo`;
  let command = `bun run lab ${name} --question "${item.question}"`;
  const flags = item.flags || {};
  for (const key of Object.keys(flags)) {
    const value = flags[key];
    command += value === "true" ? ` --${key}` : ` --${key} ${shellWord(value)}`;
  }
  return command;
}

// A new word, read from the glossary. A missing id is an error, never a blank.
export function wordOf(id: string): Word {
  const entry = GLOSSARY[id];
  if (!entry) throw new Error(`No glossary entry "${id}". Add it to src/glossary.ts.`);
  return entry;
}

// The stuck points, in the teach format. A missing entry is an error, never a blank section.
export function stuckSection(name: string): string[] {
  const entry = STUCK[name];
  if (!entry) throw new Error(`No stuck points for "${name}". Add them to src/stuck.ts.`);
  const out = ["## Stuck points", ""];
  out.push(`**Correct run:** ${entry.correct}`, "");
  out.push(`**Common wrong turn:** ${entry.wrong}`, "");
  out.push(`**Hint to give:** ${entry.hint}`, "");
  out.push("| What you see | What it means | Fix |", "| --- | --- | --- |");
  for (const [see, means, fix] of entry.rows) out.push(`| ${cell(see)} | ${cell(means)} | ${cell(fix)} |`);
  out.push("");
  return out;
}

// The picture of the lab's story. Every lab needs one, so a page is never missing it.
export function pictureOf(file: string): string {
  const slug = slugFromFile(file);
  const picture = PICTURES[slug];
  if (!picture) throw new Error(`No picture for "${slug}". Add it to src/pictures.ts.`);
  return picture;
}

export function pageFor(file: string, lab: Lab): string {
  const name = slugFromFile(file);
  const out: string[] = [`# ${lab.title}`, "", lab.about, ""];
  out.push("## The story in one picture", "", "```mermaid", pictureOf(file), "```", "");
  if (lab.challenge) out.push("## The problem", "", lab.challenge, "");
  if (lab.terms) {
    out.push("## New words", "", "Each word has one meaning in every lab.", "");
    for (const id of lab.terms) out.push(`- **${wordOf(id).word}**: ${wordOf(id).meaning}`);
    out.push("");
  }
  out.push("## Run it", "", "Copy any line into your terminal. Each one is a real example from this lab.", "");
  out.push("```bash");
  lab.cases.forEach((item) => out.push(commandFor(file, item)));
  out.push(`bun run lab ${name} --demo`, "```", "");
  out.push(`Run \`bun run lab ${name}\` with nothing else to pick an example from a menu.`, "");
  const naive = lab.cases[0].title.startsWith("NAIVE");
  out.push("## The cases", "");
  if (naive) out.push("Case 1 is the naive way. Read what goes wrong, then read the rest.", "");
  out.push("| # | Case | Why it matters | Result | Run it alone |", "| --- | --- | --- | --- | --- |");
  lab.cases.forEach((item, index) => {
    const row = [String(index + 1), item.title, item.why, item.expect, `\`${commandFor(file, item)}\``];
    out.push(`| ${row.map(cell).join(" | ")} |`);
  });
  out.push("");
  out.push(...stuckSection(name));
  if (lab.promise) {
    out.push("## The promise, and its test", "", lab.promise, "");
    out.push("```bash", `bun test tests/promises/${file.slice(0, 2)}.test.ts`, "```", "");
    out.push("To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.", "");
  }
  if (lab.production) out.push("## In production", "", lab.production, "");
  out.push("## Read the code", "", `Open \`labs/${file}\`. Read the code from the top. It holds only the lesson.`);
  out.push("The screen output is in `show/`. You do not need it to learn.", "");
  return out.join("\n");
}

// The lab index in README.md. It sits between two markers and is rewritten on every check.
export function indexFor(): string {
  const out: string[] = [];
  for (const track of TRACKS) {
    out.push(`### ${track.name}`, "", `*${track.idea}*`, "");
    out.push("| Lab | Run it | Guide |", "| --- | --- | --- |");
    for (const lab of LABS.filter((item) => item.track === track.id)) {
      const page = labFile(lab).replace(".ts", ".md");
      out.push(`| ${lab.title} | \`bun run lab ${lab.slug} --demo\` | [Read](${FOLDER}/${page}) |`);
    }
    out.push("");
  }
  return out.join("\n").trimEnd();
}

export function withIndex(readme: string): string {
  const start = readme.indexOf(INDEX_START);
  const end = readme.indexOf(INDEX_END);
  if (start < 0 || end < start) throw new Error(`README.md needs ${INDEX_START} and ${INDEX_END} markers.`);
  return `${readme.slice(0, start + INDEX_START.length)}\n${indexFor()}\n${readme.slice(end)}`;
}

async function pages(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const file of readdirSync("labs").sort()) {
    if (!/^\d\d-.*\.ts$/.test(file)) continue;
    const place = existsSync(`show/${file}`) ? "show" : "labs";
    const loaded = await import(`../${place}/${file}`);
    result[`${FOLDER}/${file.replace(".ts", ".md")}`] = pageFor(file, loaded.lab);
  }
  result[README] = withIndex(readFileSync(README, "utf8"));
  return result;
}

const mode = process.argv[2];
if (import.meta.main) {
  const all = await pages();
  if (mode === "--write") {
    mkdirSync(FOLDER, { recursive: true });
    for (const name of Object.keys(all)) writeFileSync(name, all[name]);
    console.log(`Wrote ${Object.keys(all).length} files: the lab pages and the README index.`);
  } else {
    const stale = Object.keys(all).filter((name) => !existsSync(name) || readFileSync(name, "utf8") !== all[name]);
    if (stale.length > 0) {
      console.error(`Out of date: ${stale.join(", ")}. Run: bun scripts/readme.ts --write`);
      process.exit(1);
    }
    console.log("The lab pages and the README index are up to date.");
  }
}
