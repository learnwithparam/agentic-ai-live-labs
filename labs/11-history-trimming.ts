// Trimming the chat history
//
// The Intake bot chats with a new client, Priya from Bloom Bakery. Over more than 20 messages
// she gives a budget, a deadline, the scope and a contact. The bot must fill a brief with them.
// A long chat does not fit in the window, so old messages must go. But the deadline was said
// early, in a message we cut. So the bot keeps a brief: one line for each fact, filled as it is said.
// The prompt is the brief plus the last four messages. Everything else is trimmed.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/11-history-trimming.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab history-trimming --question "Can you send me the quote today?" --chat long --naive --keep 8
//   bun run lab history-trimming --question "What do you need from me next?" --chat short --keep 4
//   bun run lab history-trimming --question "Could you put the price and date in mail?" --chat long --keep 4
//   bun run lab history-trimming --question "So are we still starting on Monday?" --chat changed
//   bun run lab history-trimming --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { FIELDS, NOT_KNOWN, parseFacts } from "../src/intake";

// One message in the chat. The client or the bot said it.
export type Turn = { from: string; text: string };
// The brief holds one answer for each field. An empty text means we do not know it yet.
export type Brief = Record<string, string>;
export type Replied = { brief: Brief; kept: Turn[]; reply: string; log: string[] };

// Fill the brief, trim the chat, then answer. Read the steps in order.
export function replyAfterTrim(turns: Turn[], keepLast: number, callLlm: CallLlm): Replied {
  // Step 1: read every client message. Each fact goes into the brief, even from an old message.
  const brief = fillBrief(turns, callLlm);
  const log = [`Step 1: the brief holds ${countFilled(brief)} of ${FIELDS.length} facts.`];

  // Step 2: trim the chat. Only the last few messages stay.
  const kept = lastTurns(turns, keepLast);
  log.push(`Step 2: kept ${kept.length} of ${turns.length} messages.`);

  // Step 3: the model reads the brief and the kept messages, then answers.
  const prompt = `INTAKE: Answer.\nBRIEF:\n${briefText(brief)}\nCHAT:\n${chatText(kept)}`;
  const reply = ask(callLlm, prompt);
  log.push(`Step 3: the bot wrote: ${reply}`);
  return { brief, kept, reply, log };
}

// The model reads one client message at a time. A newer answer replaces an older one.
function fillBrief(turns: Turn[], callLlm: CallLlm): Brief {
  const brief: Brief = {};
  for (const field of FIELDS) brief[field] = "";
  for (const turn of turns) {
    if (turn.from !== "Client") continue;
    const said = ask(callLlm, `BRIEF: Which facts does this message give?\nMESSAGE: ${turn.text}`);
    const found = parseFacts(said);
    for (const field in found) brief[field] = found[field];
  }
  return brief;
}

function lastTurns(turns: Turn[], keepLast: number): Turn[] {
  if (keepLast <= 0) return [];
  return turns.slice(-keepLast);
}

export function countFilled(brief: Brief): number {
  let filled = 0;
  for (const field of FIELDS) if (brief[field] !== "") filled += 1;
  return filled;
}

export function briefText(brief: Brief): string {
  const lines: string[] = [];
  for (const field of FIELDS) lines.push(`${field}: ${brief[field] || NOT_KNOWN}`);
  return lines.join("\n");
}

export function chatText(turns: Turn[]): string {
  const lines: string[] = [];
  for (const turn of turns) lines.push(`${turn.from}: ${turn.text}`);
  return lines.join("\n");
}

export function ask(callLlm: CallLlm, prompt: string): string {
  const reply = callLlm([{ role: "user", content: prompt }], []);
  return (reply.text || "").trim();
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/11-history-trimming");
  runLab(lab);
}
