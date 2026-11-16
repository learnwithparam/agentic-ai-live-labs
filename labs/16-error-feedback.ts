// LAB 16: GIVING THE MODEL A USEFUL ERROR
//
// Read PART 1. Tools fail. If the error says what was wrong and what is valid, the model can fix it.
// If the error only says "ERROR", the model repeats the same mistake. And some mistakes only a person can fix.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun labs/16-error-feedback.ts --question "Cardioza in Germany" --naive
//   bun labs/16-error-feedback.ts --question "Cardioza in US"
//   bun labs/16-error-feedback.ts --question "Cardioza in Germany"
//   bun labs/16-error-feedback.ts --question "Cardiozza in US"
//   bun labs/16-error-feedback.ts --demo

import { KNOWN_DRUGS, NO_DOC } from "../src/data";
import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { searchApprovedDocs } from "./01-agent-loop"; // the search from lab 1

// PART 1: THE CORE LOGIC

export type Pair = { drug: string; country: string };
export type Tool = { (guess: Pair): string };
export type Fixer = { (guess: Pair, reply: string): Pair | undefined }; // the model fixing its call
export type Result = { outcome: string; tries: number; reply: string; log: string[] };

// A useful error says what was wrong AND what is valid.
export function doseTool(guess: Pair): string {
  if (guess.country !== "US" && guess.country !== "DE") {
    return `ERROR: country "${guess.country}" is not valid. Use US or DE.`;
  }
  if (!KNOWN_DRUGS.includes(guess.drug)) {
    return `ERROR: no drug named "${guess.drug}". Known drugs: ${KNOWN_DRUGS.join(", ")}.`;
  }
  return searchApprovedDocs(guess.drug, guess.country);
}

// The NAIVE way: the same checks, but the error says nothing the model can use.
export function naiveTool(guess: Pair): string {
  const reply = doseTool(guess);
  if (reply.startsWith("ERROR")) return "ERROR";
  return reply;
}

function finish(reply: string, tries: number, log: string[]): Result {
  if (reply === NO_DOC) return { outcome: "no-source", tries, reply, log };
  if (tries === 1) return { outcome: "answered", tries, reply, log };
  return { outcome: "fixed", tries, reply, log };
}

// Try the tool. On an error, let the model fix its call. Stop after a few tries.
export function runWithFeedback(first: Pair, fix: Fixer, tool: Tool, maxTries: number): Result {
  const log: string[] = [];
  let guess = first;
  let reply = "";
  for (let tries = 1; tries <= maxTries; tries++) {
    reply = tool(guess);
    log.push(`${guess.drug} in ${guess.country}: ${reply.split("\n")[0]}`);
    if (!reply.startsWith("ERROR")) return finish(reply, tries, log);
    const next = fix(guess, reply);
    if (next === undefined) return { outcome: "ask-person", tries, reply, log };
    guess = next;
  }
  return { outcome: "gave-up", tries: maxTries, reply, log };
}

// PART 2: HOW IT IS SHOWN (you can skip this)

export const MAX_TRIES = 3;
const CODES: Record<string, string> = { germany: "DE", "united states": "US", usa: "US", us: "US", de: "DE" };

// A pretend model. It fixes what the error tells it to fix. It never changes what the doctor meant,
// so "France" is not turned into "US". That needs a person.
export const pretendFix: Fixer = (guess, reply) => {
  if (reply.includes("Use US or DE")) {
    const code = CODES[guess.country.toLowerCase()];
    if (code === undefined) return undefined;
    return { drug: guess.drug, country: code };
  }
  if (reply.includes("Known drugs")) {
    for (const name of KNOWN_DRUGS) {
      const alike = name.slice(0, 5).toLowerCase() === guess.drug.slice(0, 5).toLowerCase();
      if (alike) return { drug: name, country: guess.country };
    }
    return undefined;
  }
  return guess; // an error with no hint: the model can only try the same thing again
};

export function parseAsk(question: string): Pair {
  const parts = question.split(" in ");
  return { drug: parts[0].trim(), country: (parts[1] || "US").trim() };
}

export const lab: Lab = {
  file: "16-error-feedback.ts",
  title: "Lab 16: a useful error",
  about:
    "Each example is a question like Cardioza in Germany. The pretend model first writes the call exactly as typed. Then it fixes the call from the error, up to 3 tries.",
  terms: "retry = try the call again. hint = what the error says is valid. ask a person = stop, because only they know what was meant.",
  challenge: "A bare ERROR gives the model nothing to fix. It repeats itself until the loop runs out.",
  promise: "An error says what is valid, retries are capped, and a call that cannot be fixed goes to a person.",
  production: "Write every tool error for a reader that cannot ask questions, and count how often each error appears.",
  cases: [
    { title: "NAIVE: an error that says nothing", why: "The country is Germany, which the tool does not accept. The error only says ERROR, so the model sends the same call three times and gives up.", question: "Cardioza in Germany", flags: { naive: "true" }, expect: "gave-up" },
    { title: "A call that works", why: "Nothing to fix. One try.", question: "Cardioza in US", expect: "answered" },
    { title: "A country spelled out", why: "The error says to use US or DE. The model maps Germany to DE and tries again.", question: "Cardioza in Germany", expect: "fixed" },
    { title: "A drug with a typo", why: "The error lists the known drugs. The model picks the one that looks like its typo.", question: "Cardiozza in US", expect: "fixed" },
    { title: "EDGE: two mistakes in one call", why: "The country is fixed first, then the drug. That is three tries, which is exactly the limit.", question: "Cardiozza in Germany", expect: "fixed" },
    { title: "A country we do not serve", why: "France is not US or DE. The model must not swap it for US, because that is a different doctor's label. A person decides.", question: "Cardioza in France", expect: "ask-person" },
    { title: "A drug nobody knows", why: "Zorbex is not close to any known drug. Guessing could be dangerous, so a person decides.", question: "Zorbex in US", expect: "ask-person" },
    { title: "Valid call, no document", why: "Dermalin has no German document. That is not an error, so there is no retry. The answer is no source.", question: "Dermalin in DE", expect: "no-source" },
  ],
  play(question, flags) {
    const first = parseAsk(question);
    print(field("Call", `${first.drug} in ${first.country}`));
    const result = runWithFeedback(first, pretendFix, flags.naive ? naiveTool : doseTool, MAX_TRIES);
    rule("THE TRIES");
    result.log.forEach((line, index) => {
      const failed = line.includes("ERROR");
      console.log(`${failed ? badgeRed(`TRY ${index + 1}`) : badgeGreen(`TRY ${index + 1}`)} ${dim(line)}`);
    });
    if (result.outcome === "ask-person") box(badgeYellow("ASK A PERSON"), [yellow("The error cannot be fixed without changing what was asked.")], yellow);
    if (result.outcome === "gave-up") box(badgeRed("GAVE UP"), [red(`Still failing after ${MAX_TRIES} tries. The error gave no hint.`)], red);
    if (result.outcome === "fixed") print(field("Fixed after", `${result.tries} tries`, green));
    return result.outcome;
  },
};

if (import.meta.main) runLab(lab);
