// bun scripts/readme.ts --write   writes docs/labs/NN-*.md, one page per lab, from the lab itself
// bun scripts/readme.ts --check   fails if a page is missing or out of date (bun run check runs this)
//
// The page is made from the lab's own words (about, terms, challenge, promise, production, cases),
// so it cannot drift from the code. Nobody writes these by hand.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Case, Lab } from "../src/runner";

const FOLDER = "docs/labs";

function cell(text: string): string {
  return text.replaceAll("|", "/").replaceAll("\n", " ");
}

// The command that runs one case by itself.
export function commandFor(file: string, item: Case): string {
  let command = `bun labs/${file} --question "${item.question}"`;
  if (item.question.length > 50) return `bun labs/${file} --demo`;
  const flags = item.flags || {};
  for (const key of Object.keys(flags)) {
    const value = flags[key];
    command += value === "true" ? ` --${key}` : ` --${key} ${value}`;
  }
  return command;
}

export function pageFor(file: string, lab: Lab): string {
  const number = Number(file.slice(0, 2));
  const out: string[] = [`# ${lab.title}`, "", lab.about, ""];
  if (lab.challenge) out.push("## The problem", "", lab.challenge, "");
  if (lab.terms) out.push("## New words", "", lab.terms, "");
  out.push("## Run it", "", "Copy any line into your terminal. Each one is a real example from this lab.", "");
  out.push("```bash");
  lab.cases.forEach((item) => out.push(commandFor(file, item)));
  out.push(`bun labs/${file} --demo`, "```", "");
  out.push(`Run \`bun labs/${file}\` with nothing else to pick an example from a menu.`, "");
  const naive = lab.cases[0].title.startsWith("NAIVE");
  out.push("## The cases", "");
  if (naive) out.push("Case 1 is the naive way. Read what goes wrong, then read the rest.", "");
  out.push("| # | Case | Why it matters | Result | Run it alone |", "| --- | --- | --- | --- | --- |");
  lab.cases.forEach((item, index) => {
    const row = [String(index + 1), item.title, item.why, item.expect, `\`${commandFor(file, item)}\``];
    out.push(`| ${row.map(cell).join(" | ")} |`);
  });
  out.push("");
  if (lab.promise) {
    out.push("## The promise, and its test", "", lab.promise, "");
    out.push("```bash", `bun test tests/promises/${file.slice(0, 2)}.test.ts`, "```", "");
    out.push("To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.", "");
  }
  if (lab.production) out.push("## In production", "", lab.production, "");
  out.push("## Read the code", "", `Open \`labs/${file}\`. Read the code from the top. It holds only the lesson.`);
  out.push("The screen output is in `show/`. You can skip it.", "");
  return out.join("\n");
}

async function pages(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const file of readdirSync("labs").sort()) {
    if (!/^\d\d-.*\.ts$/.test(file)) continue;
    const place = existsSync(`show/${file}`) ? "show" : "labs";
    const loaded = await import(`../${place}/${file}`);
    result[`${FOLDER}/${file.replace(".ts", ".md")}`] = pageFor(file, loaded.lab);
  }
  return result;
}

const mode = process.argv[2];
if (import.meta.main) {
  const all = await pages();
  if (mode === "--write") {
    mkdirSync(FOLDER, { recursive: true });
    for (const name of Object.keys(all)) writeFileSync(name, all[name]);
    console.log(`Wrote ${Object.keys(all).length} lab pages to ${FOLDER}.`);
  } else {
    const stale = Object.keys(all).filter((name) => !existsSync(name) || readFileSync(name, "utf8") !== all[name]);
    if (stale.length > 0) {
      console.error(`Lab pages out of date: ${stale.join(", ")}. Run: bun scripts/readme.ts --write`);
      process.exit(1);
    }
    console.log("The lab pages are up to date.");
  }
}
