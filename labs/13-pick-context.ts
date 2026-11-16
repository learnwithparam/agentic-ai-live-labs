// LAB 13: PICKING WHAT GOES IN
//
// Read PART 1. We have three sources of facts: documents, the doctor's profile, and past emails.
// Most questions need only one. We pick the sources a question needs, and load nothing else.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun run lab 13 --question "What is the Cardioza dose?" --naive
//   bun run lab 13 --question "What is the Cardioza dose?"
//   bun run lab 13 --question "Which email was sent to me last?"
//   bun run lab 13 --question "Given my profile, what is the label?"
//   bun run lab 13 --demo

import { APPROVED_DOCS, EMAILS } from "../src/data";
import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { countTokens } from "./10-context-budget"; // the counter from lab 10

// PART 1: THE CORE LOGIC

export type Source = { name: string; keywords: string[]; text: string };

function mentions(question: string, keywords: string[]): boolean {
  const text = question.toLowerCase();
  for (const keyword of keywords) {
    if (text.includes(keyword)) return true;
  }
  return false;
}

// A source is picked when the question holds one of its keywords.
// This word list is crude. In production the model picks, using a tool (lab 5).
export function pickSources(question: string, sources: Source[]): Source[] {
  const picked: Source[] = [];
  for (const source of sources) {
    if (mentions(question, source.keywords)) picked.push(source);
  }
  return picked;
}

export function costOf(sources: Source[]): number {
  let tokens = 0;
  for (const source of sources) tokens += countTokens(source.text);
  return tokens;
}

// PART 2: HOW IT IS SHOWN (you can skip this)

function allDocuments(): string {
  const lines: string[] = [];
  for (const id in APPROVED_DOCS) lines.push(`[${id}] ${APPROVED_DOCS[id].text}`);
  return "APPROVED DOCUMENTS:\n" + lines.join("\n");
}

export const SOURCES: Source[] = [
  { name: "documents", keywords: ["dose", "side effect", "storage", "label"], text: allDocuments() },
  { name: "profile", keywords: ["my profile", "who am i", "my specialty"], text: "DOCTOR PROFILE: Dr. Lee, US, cardiology. Prefers short emails." },
  { name: "emails", keywords: ["email", "sent", "received", "outreach"], text: "RECENT EMAILS:\n" + EMAILS["H-1"].join("\n") },
];

export const lab: Lab = {
  file: "13-pick-context.ts",
  title: "Lab 13: picking what goes in",
  about:
    "Each example is a question from Dr. Lee. Three sources are on the shelf: documents, the doctor's profile and past emails. We load only the ones the question needs.",
  terms: "source = a place facts come from. picking = choosing sources per question. overloaded = more context than the question needs.",
  challenge: "Loading everything is easy. It costs tokens, hides the useful part, and shows private data that has nothing to do with the question.",
  promise: "A question loads only the sources whose keyword it holds. A question with no keyword loads nothing, and the agent asks.",
  production: "Let the model choose with a tool call, and log which sources each answer used.",
  cases: [
    { title: "NAIVE: load every source", why: "Every question carries the documents, the profile and the emails. A dose question does not need the emails, and now the model can quote them.", question: "What is the Cardioza dose?", flags: { naive: "true" }, expect: "overloaded" },
    { title: "A dose question", why: "Only the documents are loaded. The profile and the emails stay on the shelf.", question: "What is the Cardioza dose?", expect: "picked" },
    { title: "An email question", why: "Only the emails are loaded.", question: "Which email was sent to me last?", expect: "picked" },
    { title: "Two needs in one question", why: "The question needs the profile and the documents, so both are loaded. The emails are not.", question: "Given my profile, what is the label?", expect: "picked" },
    { title: "Capital letters", why: "Words are lower-cased before matching, so shouting changes nothing.", question: "DOSE???", expect: "picked" },
    { title: "Small talk", why: "No keyword matches. We load nothing, and the agent asks what the doctor needs.", question: "Hello there", expect: "unclear" },
    { title: "EDGE: a word used in another way", why: "A doctor jokes about a email. The word list cannot tell a joke from a request, so it loads the emails. Keyword rules are crude, and a model chooses better.", question: "I never read my email anyway", expect: "picked" },
    { title: "An empty question", why: "Nothing to match, so nothing is loaded.", question: "", expect: "unclear" },
  ],
  play(question, flags) {
    print(field("Question", question || "(empty)"));
    const everything = costOf(SOURCES);
    if (flags.naive) return showNaive(everything);
    const picked = pickSources(question, SOURCES);
    rule("SOURCES");
    for (const source of SOURCES) {
      const loaded = picked.includes(source);
      const badge = loaded ? badgeGreen("LOADED") : badgeYellow("SKIPPED");
      console.log(`${badge} ${source.name.padEnd(10)} ${dim(`${countTokens(source.text)} tokens`)}`);
    }
    print(field("Tokens", `${costOf(picked)} of ${everything}`, green));
    if (picked.length > 0) return "picked";
    box("UNCLEAR", [yellow("No source matches. The agent should ask what the doctor needs.")], yellow);
    return "unclear";
  },
};

function showNaive(everything: number): string {
  rule("SOURCES");
  for (const source of SOURCES) console.log(`${badgeRed("LOADED")} ${source.name}`);
  box(badgeRed("OVERLOADED"), [red(`${everything} tokens sent, whatever the question was.`)], red);
  return "overloaded";
}

if (import.meta.main) runLab(lab);
