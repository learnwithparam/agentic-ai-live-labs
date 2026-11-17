// Lab 11: Trimming the chat history
//
// Dr. Weber chats with the agent for a long time. In the first turn, the doctor said: "I work in
// Germany, so use German labels." Ten turns later comes the question: "Which dose label should I use?"
// A long chat does not fit in the window, so old turns must go. But some old turns hold a fact we
// still need, like the doctor's country. We pin those, and we trim the rest.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/11-history-trimming.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/11-history-trimming.ts --question "What is the dose of Cardioza for me?" --chat long --naive --keep 4
//   bun labs/11-history-trimming.ts --question "What is the dose of Cardioza for me?" --chat short --keep 4
//   bun labs/11-history-trimming.ts --question "What is the dose of Cardioza for me?" --chat long --keep 4
//   bun labs/11-history-trimming.ts --question "What is the dose of Cardioza for me?" --chat two-facts --keep 3
//   bun labs/11-history-trimming.ts --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";

// One turn of the chat. A fact is a turn we must never lose.
// In production the agent saves a fact with a tool (lab 34). Here we mark it by hand.
export type Turn = { text: string; fact: boolean };
export type Trimmed = { kept: Turn[]; dropped: number; note: string };

export type Replied = { kept: Turn[]; reply: string; log: string[] };

// Trim the chat, then let the model answer the last question from what is left. Read the steps in order.
export function replyAfterTrim(turns: Turn[], keepLast: number, callLlm: CallLlm): Replied {
  // Step 1: trim the chat. Pinned facts and the last few turns stay.
  const trimmed = trimHistory(turns, keepLast);
  const log = [`Step 1: kept ${trimmed.kept.length} of ${turns.length} turns. ${trimmed.note}`];

  // Step 2: the model reads what is left, and answers the last question.
  const lines: string[] = [];
  for (const turn of trimmed.kept) lines.push(turn.text);
  const prompt = `CHAT: Answer the last question from this chat only.\n${lines.join("\n")}`;
  const reply = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
  log.push(`Step 2: the model wrote: ${reply}`);
  return { kept: trimmed.kept, reply, log };
}

// Keep every pinned fact, and keep the last few turns. Everything else is left out.
export function trimHistory(turns: Turn[], keepLast: number): Trimmed {
  if (keepLast < 0) keepLast = 0;
  const firstRecent = turns.length - keepLast;
  const kept: Turn[] = [];
  let dropped = 0;
  for (let index = 0; index < turns.length; index++) {
    const turn = turns[index];
    if (turn.fact || index >= firstRecent) kept.push(turn);
    else dropped += 1;
  }
  let note = "Nothing was left out.";
  if (dropped > 0) note = `${dropped} older turns were left out.`;
  return { kept, dropped, note };
}

// The naive way: keep only the last few turns. Old facts go with the old chatter.
export function naiveTrim(turns: Turn[], keepLast: number): Turn[] {
  if (keepLast <= 0) return [];
  return turns.slice(-keepLast);
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/11-history-trimming");
  runLab(lab);
}
