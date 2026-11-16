// bun scripts/commands.ts: every run command names its file, like bun labs/01-agent-loop.ts.
// "bun run lab 16" hides which file runs, and it breaks when a lab is renumbered or renamed.
import { readdirSync, readFileSync } from "node:fs";

const FOLDERS = ["labs", "docs/labs", "paths", "scripts", "src", "tests"];
const FILES = ["README.md"];
const NUMBERED = "bun run lab ";

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
    const start = line.indexOf(NUMBERED);
    const rest = start < 0 ? "" : line.slice(start + NUMBERED.length);
    if (rest.length > 0 && rest[0] >= "0" && rest[0] <= "9") problems.push(`${file}:${index + 1}: ${line.trim()}`);
  });
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(`${problems.length} numbered run commands. Name the file: bun labs/01-agent-loop.ts`);
  process.exit(1);
}
console.log("Every run command names its lab file.");
