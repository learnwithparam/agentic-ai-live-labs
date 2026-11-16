// Shared lab runner. One lab can run three ways:
//   --question "..."  run one question
//   --demo            walk through every edge case, with a plain explanation for each
//   (nothing)         interactive menu: pick an example by number, or type your own question
import { makeModel, type Behaviour } from "./model";
import { badgeBlue, badgeGreen, badgeRed, bold, box, cyan, dim, field, green, red, rule, wrap, yellow } from "./ui";

// PLUMBING. You do not need to read this file. The lab files hold the logic.
// A gate asks a person a question and gets text back. null means no answer.
export type Ask = (prompt: string) => string | null;

// Flags look like --name value. A flag with no value is "true".
export function flags(argv = process.argv.slice(2)): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") || argv[i + 1] === undefined ? "true" : argv[++i];
  }
  return out;
}

export const modelFrom = (f: Record<string, string>) => makeModel((f.model as Behaviour) ?? "ok");

// --approve y or n answers every gate. With no flag, a person types the answer.
export function askFrom(f: Record<string, string>): Ask {
  return (text) => {
    if (f.approve) {
      console.log(`${badgeBlue("?")} ${text}${f.approve}  (answered by --approve)`);
      return f.approve;
    }
    return prompt(`${badgeBlue("?")} ${text}`);
  };
}

export type Flags = Record<string, string>;
export type Case = { title: string; why: string; question: string; flags?: Flags; expect: string };
export type Lab = {
  file: string;
  title: string;
  about: string;
  cases: Case[];
  // Runs one question, prints what happened, and returns a short outcome word for the case to be checked against.
  play: (question: string, f: Flags, ask: Ask) => string;
};

export const commandFor = (lab: Lab, question: string, f: Flags = {}) =>
  `bun labs/${lab.file} --question "${question}"${Object.entries(f).map(([k, v]) => ` --${k} ${v}`).join("")}`;

// Runs every case and returns the ones whose outcome was not the expected one.
export function checkCases(lab: Lab, base: Flags = {}) {
  const failures: { title: string; expect: string; got: string }[] = [];
  for (const c of lab.cases) {
    const f = { ...base, ...c.flags };
    const got = lab.play(c.question, f, askFrom(f));
    if (got !== c.expect) failures.push({ title: c.title, expect: c.expect, got });
  }
  return failures;
}

function header(lab: Lab) {
  console.log();
  box(lab.title, wrap(lab.about), cyan);
}

function runDemo(lab: Lab, base: Flags): boolean {
  header(lab);
  let good = 0;
  lab.cases.forEach((c, i) => {
    const f = { ...base, ...c.flags };
    rule(`Case ${i + 1} of ${lab.cases.length}`);
    console.log(`${bold(c.title)}\n`);
    for (const l of field("Why", c.why, yellow)) console.log(l);
    for (const l of field("Run it", commandFor(lab, c.question, c.flags), dim)) console.log(l);
    console.log();
    const got = lab.play(c.question, f, askFrom(f));
    const same = got === c.expect;
    good += same ? 1 : 0;
    console.log(`\n${same ? badgeGreen("EXPECTED") : badgeRed("SURPRISE")} ${same ? green(`outcome: ${got}`) : red(`wanted ${c.expect}, got ${got}`)}`);
  });
  rule();
  const all = good === lab.cases.length;
  console.log(`${all ? badgeGreen("DONE") : badgeRed("FAILED")} ${good} of ${lab.cases.length} cases behaved as expected.\n`);
  return all;
}

function runMenu(lab: Lab, f: Flags) {
  header(lab);
  console.log(bold("Examples"));
  lab.cases.forEach((c, i) => console.log(`  ${cyan(String(i + 1).padStart(2))}  ${c.title}`));
  console.log(dim(`\nTip: bun labs/${lab.file} --demo walks through every example and explains each one.`));
  for (;;) {
    const input = prompt(`\n${badgeBlue("?")} Pick 1-${lab.cases.length}, or type your own question (empty to quit): `);
    if (!input?.trim()) return;
    const n = Number(input);
    const picked = Number.isInteger(n) ? lab.cases[n - 1] : undefined;
    if (Number.isInteger(n) && !picked) {
      console.log(red(`  No example ${n}. Pick 1 to ${lab.cases.length}.`));
      continue;
    }
    const run = { ...f, ...picked?.flags };
    const question = picked ? picked.question : input;
    if (picked) {
      console.log(`\n${bold(picked.title)}`);
      for (const l of field("Why", picked.why, yellow)) console.log(l);
    }
    console.log();
    lab.play(question, run, askFrom(run));
  }
}

export function runLab(lab: Lab) {
  const f = flags();
  if (f.demo) {
    const ok = runDemo(lab, { ...f, demo: "" });
    if (!ok) process.exit(1);
  } else if (f.question) {
    console.log();
    lab.play(f.question, f, askFrom(f));
  } else runMenu(lab, f);
}
