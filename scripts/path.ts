// bun run path              lists the learning paths
// bun run path beginner     shows one path, and which labs are ready
// bun run path --write      rewrites paths/*.md from src/roadmap.ts
// bun run path --check      fails if paths/*.md is out of date (bun run check runs this)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { LABS, PATHS, TRACKS, type Path, type RoadmapLab } from "../src/roadmap";
import { badgeGreen, badgeYellow, bold, box, cyan, dim, field, green, print, yellow } from "../src/ui";

export function labFile(lab: RoadmapLab): string {
  const padded = String(lab.number).padStart(2, "0");
  return `${padded}-${lab.slug}.ts`;
}

export function isReady(lab: RoadmapLab): boolean {
  return existsSync(`labs/${labFile(lab)}`);
}

export function findLab(number: number): RoadmapLab {
  const lab = LABS.find((item) => item.number === number);
  if (!lab) throw new Error(`No lab ${number} in the roadmap`);
  return lab;
}

export function mainSteps(path: Path) {
  return path.steps.filter((step) => !step.optional);
}

function hoursText(path: Path): string {
  const hours = (mainSteps(path).length * path.minutesPerLab) / 60;
  return `${Math.round(hours * 2) / 2} hours`;
}

function stepTable(path: Path, optional: boolean): string[] {
  const rows = ["| Lab | Command | What to do |", "| --- | --- | --- |"];
  for (const step of path.steps) {
    if (Boolean(step.optional) !== optional) continue;
    const lab = findLab(step.lab);
    rows.push(`| ${lab.number}. ${lab.title} | \`bun run lab ${lab.number} --demo\` | ${step.note} |`);
  }
  return rows;
}

function renderPath(path: Path): string {
  const lines = [`# Path: ${path.name}`, ""];
  lines.push(`**For:** ${path.forWho}`, "");
  lines.push(`**Goal:** ${path.goal}`, "");
  const time = `${hoursText(path)} for the main steps, about ${path.minutesPerLab} minutes a lab.`;
  lines.push(`**Time:** ${time}`, "");
  lines.push("## How to work", "");
  for (const way of path.howToWork) lines.push(`- ${way}`);
  lines.push("", "## Do these", "", ...stepTable(path, false));
  if (path.steps.some((step) => step.optional)) {
    lines.push("", "## Optional", "", ...stepTable(path, true));
  }
  lines.push("", "## When you finish", "", path.finish, "");
  if (path.next === "add") {
    lines.push("Next: add your own lab. See Add a lab in the main README.", "");
  } else {
    const next = PATHS.find((item) => item.id === path.next);
    lines.push(`Next: [${next?.name}](${path.next}.md).`, "");
  }
  return lines.join("\n");
}

function renderIndex(): string {
  const lines = ["# Learning paths", ""];
  lines.push("Pick the path that matches you. Every path uses the same labs in a different order.", "");
  lines.push("| Path | For | Labs | Time |", "| --- | --- | --- | --- |");
  for (const path of PATHS) {
    const count = `${mainSteps(path).length} main, ${path.steps.length - mainSteps(path).length} optional`;
    lines.push(`| [${path.name}](${path.id}.md) | ${path.forWho} | ${count} | ${hoursText(path)} |`);
  }
  lines.push("", "Not sure? Start with Beginners. If you never code, start with Noobs.", "");
  lines.push("## All labs by track", "");
  for (const track of TRACKS) {
    lines.push(`### ${track.name}`, "", track.idea, "");
    lines.push("| Lab | What it teaches |", "| --- | --- |");
    for (const lab of LABS.filter((item) => item.track === track.id)) {
      lines.push(`| ${lab.number}. ${lab.title} | ${lab.idea} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function renderAll(): Record<string, string> {
  const files: Record<string, string> = { "paths/README.md": renderIndex() };
  for (const path of PATHS) files[`paths/${path.id}.md`] = renderPath(path);
  return files;
}

function showList() {
  console.log();
  for (const path of PATHS) {
    console.log(`${cyan(path.id.padEnd(13))} ${bold(path.name)}  ${dim(hoursText(path))}`);
    console.log(`${" ".repeat(14)}${dim(path.forWho)}`);
  }
  console.log(dim("\nbun run path <name> shows the steps."));
}

function showPath(path: Path) {
  console.log();
  const header = [...field("For", path.forWho), ...field("Goal", path.goal), ...field("Time", hoursText(path))];
  box(`Path: ${path.name}`, header, cyan);
  for (const [index, way] of path.howToWork.entries()) print(field(index === 0 ? "How" : "", way, dim));
  console.log();
  for (const step of path.steps) {
    const lab = findLab(step.lab);
    const ready = isReady(lab) ? badgeGreen("READY") : badgeYellow("COMING");
    const tag = step.optional ? dim("optional") : "        ";
    console.log(`${ready} ${tag} ${String(lab.number).padStart(2)}. ${bold(lab.title)}`);
    console.log(`${" ".repeat(26)}${dim(step.note)}`);
  }
  console.log(`\n${green("Finish:")} ${path.finish}`);
  if (LABS.some((lab) => !isReady(lab))) console.log(yellow("Labs marked COMING are not written yet."));
}

if (import.meta.main) {
  const argument = process.argv[2];
  if (argument === "--write" || argument === "--check") {
    const files = renderAll();
    mkdirSync("paths", { recursive: true });
    let stale = 0;
    for (const name in files) {
      const current = existsSync(name) ? readFileSync(name, "utf8") : "";
      if (current === files[name]) continue;
      stale++;
      if (argument === "--write") writeFileSync(name, files[name]);
      else console.error(`${name} is out of date. Run: bun run path --write`);
    }
    if (argument === "--check" && stale > 0) process.exit(1);
    console.log(argument === "--write" ? `Wrote ${stale} changed files.` : "The path files are up to date.");
  } else if (!argument) showList();
  else {
    const path = PATHS.find((item) => item.id === argument);
    if (!path) {
      console.error(`No path "${argument}". Try: ${PATHS.map((item) => item.id).join(", ")}`);
      process.exit(1);
    }
    showPath(path);
  }
}
