// Shared lab runner. One lab can run three ways:
//   --question "..."  run one question.
//   --demo            walk through every edge case, with a plain explanation for each.
//   (nothing)         interactive menu. Pick an example by number, or type your own question.
import { GLOSSARY } from "./glossary";
import { makeLiveModel, LIVE_MODEL } from "./live";
import { makeModel, type Behaviour } from "./model";
import { slugFromFile, whereAmI } from "./roadmap";
import { badgeBlue, badgeGreen, badgeRed, bold, box, cyan, dim, field, green } from "./ui";
import { print, red, rule, wrap, yellow } from "./ui";

// PLUMBING. You do not need to read this file. The lab files hold the logic.
// A gate asks a person a question and gets text back. null means no answer.
export type Ask = (prompt: string) => string | null;

// Plain words for the common flags: demo, naive or live. A word right after a --flag is its value.
const EASY: Record<string, string> = { demo: "--demo", naive: "--naive", live: "--live" };
export function easyWords(words: string[]): string[] {
  const easyFlags = Object.values(EASY);
  const takesValue = (word?: string) => !!word?.startsWith("--") && !easyFlags.includes(word);
  return words.map((word, i) => (takesValue(words[i - 1]) ? word : EASY[word] || word));
}

// Flags look like --name value. A flag with no value is "true".
export function flags(argv = process.argv.slice(2)): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") || argv[i + 1] === undefined ? "true" : argv[++i];
  }
  return out;
}

// --live uses a real model (see src/live.ts). Otherwise --model picks how the pretend model behaves.
export function modelFrom(f: Record<string, string>) {
  if (f.live) return makeLiveModel(f.live === "true" ? LIVE_MODEL : f.live);
  return makeModel((f.model as Behaviour) ?? "ok");
}

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
  // Optional notes for newer labs. The readable gate requires them from the tool schema lab on.
  terms?: string[];    // ids from src/glossary.ts: 2 to 5 new words, each with one plain meaning
  challenge?: string;  // the problem this lab solves
  promise?: string;    // what a test proves
  production?: string; // what this becomes in a real system
  cases: Case[];
  // Runs one question, prints what happened, and returns a short outcome word.
  // The demo and the tests compare that word with the case's expect.
  play: (question: string, flags: Flags, ask: Ask) => string;
};

// The command a learner can copy to repeat one case.
export function commandFor(lab: Lab, question: string, flags: Flags = {}): string {
  let command = `bun run lab ${slugFromFile(lab.file)} --question "${question}"`;
  for (const name in flags) command += flags[name] === "true" ? ` --${name}` : ` --${name} ${shellWord(flags[name])}`;
  return command;
}

// A flag value that holds spaces or quotes is wrapped in single quotes. So a copied line still works.
export function shellWord(value: string): string {
  if (value !== "" && !/[^A-Za-z0-9._:\/-]/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
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
  console.log(dim(whereAmI(Number(lab.file.slice(0, 2)))));
  const notes = [
    ...(lab.terms ? lab.terms.flatMap((id, index) => field(index === 0 ? "Words" : "", `${GLOSSARY[id].word}: ${GLOSSARY[id].meaning}`, dim, 11)) : []),
    ...(lab.challenge ? field("Challenge", lab.challenge, yellow, 11) : []),
    ...(lab.promise ? field("Promise", lab.promise, green, 11) : []),
    ...(lab.production ? field("Production", lab.production, cyan, 11) : []),
  ];
  if (notes.length > 0) print(notes);
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
  header(lab);
  console.log(bold("Examples"));
  for (const [index, thisCase] of lab.cases.entries()) {
    console.log(`  ${cyan(String(index + 1).padStart(2))}  ${thisCase.title}`);
  }
  console.log(dim(`\nTip: bun run lab ${slugFromFile(lab.file)} --demo walks through every example and explains each one.`));
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
