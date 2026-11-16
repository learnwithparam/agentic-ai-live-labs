// LAB 10: THE CONTEXT BUDGET
//
// Read PART 1. A model reads a limited amount of text each turn. That limit is the window.
// We count what goes in, keep what must stay, and drop the least useful parts first.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun run lab 10 --question "Cardioza dose" --naive --window 60
//   bun run lab 10 --question "Cardioza dose" --window 200
//   bun run lab 10 --question "Cardioza dose" --window 70
//   bun run lab 10 --question "Cardioza dose" --window 40
//   bun run lab 10 --demo

import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { searchApprovedDocs } from "./01-agent-loop"; // the search from lab 1

// PART 1: THE CORE LOGIC

// A part of the prompt. "must" parts are never dropped.
export type Part = { name: string; text: string; must: boolean };
export type Built = {
  prompt: string;
  used: number;
  kept: string[];
  dropped: string[];
  fits: boolean;
};

// A rough count: one token is about four letters. Real systems use the model's own counter.
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Keep the must parts. Then add the other parts in order, and drop any that no longer fit.
export function buildPrompt(parts: Part[], budget: number): Built {
  let used = 0;
  const keep: Record<string, boolean> = {};
  for (const part of parts) {
    if (!part.must) continue;
    used += countTokens(part.text);
    keep[part.name] = true;
  }
  if (used > budget) return { prompt: "", used, kept: [], dropped: [], fits: false };

  for (const part of parts) {
    if (part.must) continue;
    const cost = countTokens(part.text);
    if (used + cost > budget) continue;
    used += cost;
    keep[part.name] = true;
  }

  const kept: string[] = [];
  const dropped: string[] = [];
  let prompt = "";
  for (const part of parts) {
    if (keep[part.name]) {
      kept.push(part.name);
      prompt += part.text + "\n";
    } else dropped.push(part.name);
  }
  return { prompt, used, kept, dropped, fits: true };
}

// The NAIVE way: join everything and let the window cut the oldest text, which comes first.
export function naiveWindow(parts: Part[], budget: number): string {
  let all = "";
  for (const part of parts) all += part.text + "\n";
  return all.slice(Math.max(0, all.length - budget * 4));
}

// PART 2: HOW IT IS SHOWN (you can skip this)

const RULES = "RULES: Use ONLY the approved documents. Cite their ids. Never share patient details.";
const HISTORY = [
  "Doctor: Hello, I am Dr. Lee. I work in cardiology.",
  "Agent: Hello Dr. Lee. How can I help today?",
  "Doctor: I have questions about the launch email I got last week.",
  "Agent: Of course. Which product was it about?",
].join("\n");

function partsFor(question: string): Part[] {
  return [
    { name: "rules", text: RULES, must: true },
    { name: "doctor", text: "DOCTOR: Dr. Lee, US, cardiology.", must: false },
    { name: "documents", text: "DOCUMENTS:\n" + searchApprovedDocs(question, "US"), must: false },
    { name: "history", text: "HISTORY:\n" + HISTORY, must: false },
    { name: "question", text: `QUESTION: ${question}`, must: true },
  ];
}

export const lab: Lab = {
  file: "10-context-budget.ts",
  title: "Lab 10: the context budget",
  about:
    "Each example builds the prompt for one question under a token budget. Use --window 80 to change the budget. The prompt holds rules, a doctor note, documents, chat history and the question.",
  terms: "context window = the most text a model reads at once. token = a small piece of text, about four letters. budget = the tokens we allow ourselves.",
  challenge: "A prompt grows every turn. When it passes the window, something is cut, and nobody chooses what.",
  promise: "The prompt never passes the budget, and the rules and the question are never dropped.",
  production: "Count with the model's own counter, keep a reserve for the reply, and log what was dropped on every call.",
  cases: [
    { title: "NAIVE: let the window cut the oldest text", why: "The rules come first, so they are the oldest text. When the window is full, they are the first thing cut. The model now answers with no rules.", question: "Cardioza dose", flags: { naive: "true", window: "60" }, expect: "rules-lost" },
    { title: "Plenty of room", why: "Everything fits, so everything is sent.", question: "Cardioza dose", flags: { window: "200" }, expect: "all-fit" },
    { title: "A tighter window", why: "The chat history is the least useful part, so it goes first.", question: "Cardioza dose", flags: { window: "70" }, expect: "dropped: history" },
    { title: "A tight window", why: "The documents also stop fitting. We keep the rules, the question and the small doctor note. The model has to refuse, which is safe.", question: "Cardioza dose", flags: { window: "40" }, expect: "dropped: documents, history" },
    { title: "Two drugs, bigger documents", why: "Two documents are larger. The window drops the history and then the documents, and the doctor note survives.", question: "Cardioza and Neurovex dose", flags: { window: "60" }, expect: "dropped: documents, history" },
    { title: "The must parts do not fit", why: "A budget of 10 cannot hold the rules and the question. We say so. We never send a prompt without its rules.", question: "Cardioza dose", flags: { window: "10" }, expect: "too-small" },
    { title: "A very long question", why: "The question alone is bigger than the window. The doctor must shorten it. We do not cut it for them.", question: "Cardioza dose " + "please tell me more ".repeat(20), flags: { window: "80" }, expect: "too-small" },
  ],
  play(question, flags) {
    const budget = Number(flags.window || 120);
    const parts = partsFor(question);
    print(field("Window", `${budget} tokens`));
    if (flags.naive) return showNaive(parts, budget);
    const built = buildPrompt(parts, budget);
    rule("PROMPT PARTS");
    for (const part of parts) {
      const kept = built.kept.includes(part.name);
      const badge = kept ? badgeGreen("KEPT") : badgeRed("DROPPED");
      const size = `${countTokens(part.text)} tokens${part.must ? ", must stay" : ""}`;
      console.log(`${badge} ${part.name.padEnd(10)} ${dim(size)}`);
    }
    if (!built.fits) {
      box("TOO SMALL", [red(`The must parts need ${built.used} tokens. The window is ${budget}.`)], red);
      return "too-small";
    }
    print(field("Used", `${built.used} of ${budget} tokens`, green));
    if (built.dropped.length === 0) return "all-fit";
    box("TRIMMED", [yellow(`Dropped: ${built.dropped.join(", ")}`)], yellow);
    return `dropped: ${built.dropped.join(", ")}`;
  },
};

function showNaive(parts: Part[], budget: number): string {
  const seen = naiveWindow(parts, budget);
  rule("WHAT THE MODEL READS");
  console.log(dim(seen.trim()));
  const lost = !seen.includes("Use ONLY");
  const badge = lost ? badgeRed("RULES LOST") : badgeYellow("RULES KEPT");
  box(badge, [yellow(lost ? "The rules were cut. No one was told." : "This time the rules survived.")], yellow);
  return lost ? "rules-lost" : "rules-kept";
}

if (import.meta.main) runLab(lab);
