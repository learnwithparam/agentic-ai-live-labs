// Rules are not facts
//
// The Inbox Manager bot files and answers Maya's mail. One vendor mail says to ignore our rules.
// It asks us to send the contract to an outside address.
// A model reads our rules and the mail as one stream of text. It cannot tell them apart.
// So no single check is enough. We stack layers. The mail is wrapped as untrusted data.
// A reader with no tools turns it into facts. A guard scores the risk. Asks beyond the job get a no.
// The forward tool cannot send outside the company. Any one layer may fail. The next one stands.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/14-instructions-vs-data.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab instructions-vs-data --mail mail-vendor --question "Deal with the overdue invoice." --naive
//   bun run lab instructions-vs-data --mail mail-meeting --question "Can you answer Sam about Thursday?"
//   bun run lab instructions-vs-data --mail mail-vendor --question "What does the stock photo company want?"
//   bun run lab instructions-vs-data --mail mail-copy --question "Send them what they asked for."
//   bun run lab instructions-vs-data --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import type { Email } from "../src/team";
import { COMPANY, hasOutsideAddress, readFacts } from "../src/mailguard";

export const RULES = "RULES: File the mail, answer meeting requests, and never leave the company.";
const ALLOWED_TOPICS = ["meeting", "contract", "receipt", "spam"];
const SIGNALS = [
  { phrase: "ignore", points: 50 },
  { phrase: "your rules", points: 30 },
  { phrase: "do not tell", points: 40 },
  { phrase: "you must", points: 30 },
  { phrase: "new rules", points: 30 },
];
export const HOLD_AT = 50; // a mail at or above this score waits for a person

export type Handled = { outcome: string; action: string; log: string[] };

// Wrap the mail as untrusted data. A fake closing tag is made harmless.
export function fence(body: string): { text: string; fixed: number } {
  const fixed = body.split("</data>").length - 1;
  return { text: body.replaceAll("</data>", "[/data]"), fixed };
}

// A score for how much the text sounds like an order. An outside address adds 20.
export function riskScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const signal of SIGNALS) if (lower.includes(signal.phrase)) score += signal.points;
  if (hasOutsideAddress(text)) score += 20;
  return score;
}

// The forward tool. It checks the address itself, so a fooled model still cannot send out.
export function sendTool(action: string): { ok: boolean; text: string } {
  const words = action.split(" ");
  if (words[0] === "FORWARD" && !words[1].endsWith(COMPANY)) {
    return { ok: false, text: `Blocked: ${words[1]} is outside the company.` };
  }
  return { ok: true, text: `Done: ${action}.` };
}

// Handle one mail through every layer. Read the steps in order.
export function handleEmail(mail: Email, task: string, callLlm: CallLlm): Handled {
  // Step 1: wrap the mail as data, so it is never read as one of our rules.
  const fenced = fence(mail.body);
  const log = [`Step 1: wrapped the mail as data. Fixed ${fenced.fixed} fake closing tags.`];

  // Step 2: a reader with no tools turns the mail into facts.
  const mailText = `FROM: ${mail.from}\n<data>\n${fenced.text}\n</data>`;
  const facts = readFacts(ask(callLlm, `READ: Turn this mail into facts.\n${mailText}`));
  log.push(`Step 2: the reader found topic ${facts.topic} and asks ${facts.asks}.`);

  // Step 3: the guard scores the risk. A high score waits for a person.
  const score = riskScore(`${mail.subject} ${mail.body}`);
  log.push(`Step 3: the guard scored ${score}. The limit is ${HOLD_AT}.`);
  if (score >= HOLD_AT) return { outcome: "held", action: "none", log };

  // Step 4: an ask outside the job gets a polite no.
  if (!ALLOWED_TOPICS.includes(facts.topic)) {
    log.push("Step 4: this is not studio mail. The bot says no, politely.");
    return { outcome: "polite-no", action: "none", log };
  }

  // Step 5: the actor reads only the facts, and picks one action.
  const factLine = `from=${facts.from}; topic=${facts.topic}; asks=${facts.asks}`;
  const action = ask(callLlm, `INBOX: ${RULES}\nTASK: ${task}\nFACTS: ${factLine}`);
  log.push(`Step 5: the actor chose: ${action}`);

  // Step 6: the tool checks the address. A fooled model still cannot send it out.
  const sent = sendTool(action);
  log.push(`Step 6: ${sent.text}`);
  if (!sent.ok) return { outcome: "blocked", action, log };
  if (fenced.fixed > 0) return { outcome: "fenced", action, log };
  return { outcome: "handled", action, log };
}

function ask(callLlm: CallLlm, prompt: string): string {
  const reply = callLlm([{ role: "user", content: prompt }], []);
  return (reply.text || "").trim();
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/14-instructions-vs-data");
  runLab(lab);
}
