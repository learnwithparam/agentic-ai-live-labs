// bun scripts/commands.ts: every run command uses the concept name, like bun run lab agent-loop.
// "bun run lab 16" and "bun labs/16-error-feedback.ts" both break when the file order changes.
// So neither form may appear in a page, a comment or the README.
// A question about a dose must read like a doctor wrote it, not like a search: "Zorbex dose" fails.
import { readdirSync, readFileSync } from "node:fs";

const FOLDERS = ["labs", "show", "docs/labs", "paths", "scripts", "src", "tests"];
const FILES = ["README.md"];
const BY_NUMBER = /bun run lab \d/;
const BY_FILE = /bun labs\//;

function filesIn(folder: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) found.push(...filesIn(path));
    else if (path.endsWith(".ts") || path.endsWith(".md")) found.push(path);
  }
  return found;
}

const problems: string[] = [];
const all = [...FILES];
for (const folder of FOLDERS) all.push(...filesIn(folder));
for (const file of all) {
  if (file === "scripts/commands.ts") continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, index) => {
    if (BY_NUMBER.test(line)) problems.push(`${file}:${index + 1}: uses a number (${line.trim()}). Use the concept name.`);
    if (BY_FILE.test(line)) problems.push(`${file}:${index + 1}: uses the file name (${line.trim()}). Use bun run lab <name>.`);
    for (const found of line.matchAll(/--question "([^"]*)"/g)) {
      const words = found[1].trim().split(" ").length;
      if (found[1].trim() !== "" && words < 5 && !found[1].includes("$") && found[1] !== "..." && !found[1].includes("example")) problems.push(`${file}:${index + 1}: short question (ask a full question of five words or more) "${found[1]}"`);
    }
  });
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(`${problems.length} bad run commands. Write them as: bun run lab agent-loop --question "a full question".`);
  process.exit(1);
}
console.log("Every run command uses a concept name.");
