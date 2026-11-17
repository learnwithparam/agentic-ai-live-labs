// bun run mermaid: every picture in the lab pages and the README must render.
// It renders each ```mermaid block with mmdc. A block that does not render is reported.
// Needs mmdc on the PATH: npm i -g @mermaid-js/mermaid-cli (the same tool the teach repo uses).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// GitHub's Linux runners need Chromium without its sandbox, so mmdc reads this config.
const PUPPETEER = join(import.meta.dir, "mermaid-puppeteer.json");

export function mermaidBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/^```mermaid\n([\s\S]*?)^```$/gm)].map((match) => match[1]);
}

export function renderProblems(file: string, markdown: string): string[] {
  const blocks = mermaidBlocks(markdown);
  if (blocks.length === 0) return [];
  const dir = mkdtempSync(join(tmpdir(), "mmd-"));
  const problems: string[] = [];
  blocks.forEach((source, index) => {
    const input = join(dir, `block-${index + 1}.mmd`);
    writeFileSync(input, source);
    try {
      execFileSync("mmdc", ["-q", "-p", PUPPETEER, "-i", input, "-o", join(dir, `block-${index + 1}.svg`)], { stdio: "pipe" });
    } catch (error) {
      const detail = String((error as { stderr?: Buffer }).stderr ?? (error as Error).message).split("\n").find((line) => line.trim()) ?? "render failed";
      problems.push(`${file}: picture ${index + 1} does not render: ${detail.trim()}`);
    }
  });
  return problems;
}

if (import.meta.main) {
  const files = readdirSync("docs/labs").filter((name) => name.endsWith(".md")).map((name) => `docs/labs/${name}`);
  files.push("README.md");
  const problems = files.flatMap((file) => renderProblems(file, readFileSync(file, "utf8")));
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) {
    console.error(`${problems.length} pictures do not render.`);
    process.exit(1);
  }
  console.log("Every picture renders.");
}
