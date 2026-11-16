// Shared lab runner. One lab can run three ways:
//   --question "..."  run one question
//   --demo            walk through every edge case, with a plain explanation for each
//   (nothing)         interactive menu: pick an example by number, or type your own question
import { makeModel, type Behaviour } from "./model";
import { badgeBlue, badgeGreen, badgeRed, bold, box, cyan, dim, field, green } from "./ui";
import { print, red, rule, wrap, yellow } from "./ui";

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
  // Runs one question, prints what happened, and returns a short outcome word.
  // The demo and the tests compare that word with the case's expect.
  play: (question: string, flags: Flags, ask: Ask) => string;
};

// The command a learner can copy to repeat one case.
export function commandFor(lab: Lab, question: string, flags: Flags = {}): string {
  let command = `bun run lab ${Number(lab.file.slice(0, 2))} --question "${question}"`;
  for (const name in flags) command += ` --${name} ${flags[name]}`;
  return command;
}

// Runs every case and returns the ones whose outcome was not the expected one.
export function checkCases(lab: Lab, base: Flags = {}) {
  const failures: { title: string; expect: string; got: string }[] = [];
  for (const thisCase of lab.cases) {
    const caseFlags = { ...base, ...thisCase.flags };
    const got = lab.play(thisCase.question, caseFlags, askFrom(caseFlags));
    if (got !== thisCase.expect) failures.push({ title: thisCase.title, expect: thisCase.expect, got });
  }
  return failures;
}

function header(lab: Lab) {
  console.log();
  box(lab.title, wrap(lab.about), cyan);
}

function runDemo(lab: Lab, base: Flags): boolean {
  header(lab);
  let matched = 0;
  for (const [index, thisCase] of lab.cases.entries()) {
    const caseFlags = { ...base, ...thisCase.flags };
    rule(`Case ${index + 1} of ${lab.cases.length}`);
    console.log(`${bold(thisCase.title)}\n`);
    print(field("Why", thisCase.why, yellow));
    print(field("Run it", commandFor(lab, thisCase.question, thisCase.flags), dim));
    console.log();
    const got = lab.play(thisCase.question, caseFlags, askFrom(caseFlags));
    if (got === thisCase.expect) {
      matched++;
      console.log(`\n${badgeGreen("EXPECTED")} ${green(`outcome: ${got}`)}`);
    } else {
      console.log(`\n${badgeRed("SURPRISE")} ${red(`wanted ${thisCase.expect}, got ${got}`)}`);
    }
  }
  rule();
  const allMatched = matched === lab.cases.length;
  const badge = allMatched ? badgeGreen("DONE") : badgeRed("FAILED");
  console.log(`${badge} ${matched} of ${lab.cases.length} cases behaved as expected.\n`);
  return allMatched;
}

function runMenu(lab: Lab, flags: Flags) {
  const number = Number(lab.file.slice(0, 2));
  header(lab);
  console.log(bold("Examples"));
  for (const [index, thisCase] of lab.cases.entries()) {
    console.log(`  ${cyan(String(index + 1).padStart(2))}  ${thisCase.title}`);
  }
  console.log(dim(`\nTip: bun run lab ${number} --demo walks through every example and explains each one.`));
  while (true) {
    const input = prompt(`\n${badgeBlue("?")} Pick 1-${lab.cases.length}, or type your own question (empty to quit): `);
    if (!input || !input.trim()) return;
    const picked = lab.cases[Number(input) - 1];
    if (Number.isInteger(Number(input)) && !picked) {
      console.log(red(`  No example ${input}. Pick 1 to ${lab.cases.length}.`));
      continue;
    }
    const runFlags = { ...flags, ...(picked ? picked.flags : {}) };
    if (picked) {
      console.log(`\n${bold(picked.title)}`);
      print(field("Why", picked.why, yellow));
    }
    console.log();
    lab.play(picked ? picked.question : input, runFlags, askFrom(runFlags));
  }
}

export function runLab(lab: Lab) {
  const flagsFromUser = flags();
  if (flagsFromUser.demo) {
    const allMatched = runDemo(lab, { ...flagsFromUser, demo: "" });
    if (!allMatched) process.exit(1);
  } else if (flagsFromUser.question) {
    console.log();
    lab.play(flagsFromUser.question, flagsFromUser, askFrom(flagsFromUser));
  } else runMenu(lab, flagsFromUser);
}
