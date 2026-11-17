// bun run stuck: every lab has stuck points, in the teach format, and each outcome they name is real.
//
// Checks, with the rule number in each message:
//   S1  every lab has one entry in src/stuck.ts, and no entry is left without a lab
//   S2  correct run, common wrong turn and hint are each one short sentence
//   S3  each table row has 2 to 4 rows, and each cell is filled
//   S4  an outcome a row names (outcome: word) is an outcome that the lab's cases really return
import { STUCK } from "../src/stuck";
import { loadLabs } from "./glossary";
import { sentencesOf } from "./plain-english";
import { slugFromFile } from "../src/roadmap";

const MOST_ROWS = 4;
const FEWEST_ROWS = 2;
const MOST_WORDS = 18;

export function stuckProblems(labs: { file: string; lab: { cases: { expect: string }[] } }[]): string[] {
  const found: string[] = [];
  const slugs = labs.map((item) => slugFromFile(item.file));
  for (const slug of slugs) if (!STUCK[slug]) found.push(`S1 ${slug}: no stuck points in src/stuck.ts`);
  for (const slug of Object.keys(STUCK)) if (!slugs.includes(slug)) found.push(`S1 "${slug}" in src/stuck.ts has no lab`);

  for (const { file, lab } of labs) {
    const slug = slugFromFile(file);
    const entry = STUCK[slug];
    if (!entry) continue;
    for (const [label, text] of [["correct run", entry.correct], ["common wrong turn", entry.wrong], ["hint", entry.hint]] as const) {
      const sentences = sentencesOf(text);
      if (text.trim() === "") found.push(`S2 ${slug}: ${label} is empty`);
      if (sentences.length > 2) found.push(`S2 ${slug}: ${label} has ${sentences.length} sentences; keep to 2`);
      for (const sentence of sentences) {
        const count = sentence.split(/\s+/).length;
        if (count > MOST_WORDS) found.push(`S2 ${slug}: ${label} has a ${count}-word sentence; keep to ${MOST_WORDS}`);
      }
    }
    if (entry.rows.length < FEWEST_ROWS || entry.rows.length > MOST_ROWS) {
      found.push(`S3 ${slug}: ${entry.rows.length} rows; keep to ${FEWEST_ROWS} to ${MOST_ROWS}`);
    }
    const outcomes = new Set(lab.cases.map((item) => item.expect));
    for (const row of entry.rows) {
      if (row.some((cell) => cell.trim() === "")) found.push(`S3 ${slug}: a row has an empty cell`);
      for (const cell of row) {
        for (const match of cell.matchAll(/outcome: (.+?)(?= on the |$)/g)) {
          if (!outcomes.has(match[1])) found.push(`S4 ${slug}: the demo never prints outcome "${match[1]}"`);
        }
      }
    }
  }
  return found;
}

if (import.meta.main) {
  const problems = stuckProblems(await loadLabs());
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) {
    console.error(`${problems.length} stuck-point problems.`);
    process.exit(1);
  }
  console.log("Every lab has stuck points, and every outcome they name is real.");
}
