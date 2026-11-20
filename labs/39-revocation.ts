// Withdrawn documents and the cache
//
// Dr. Lee asks for the Cardioza dose. The bot saves the answer, so the next ask is fast.
// Then the company withdraws the document. The label changed, and the old dose is now wrong.
// The saved answer still holds the old dose. A fast bot would give it to Dr. Lee again.
// So a withdrawal is written in a list, and every answer is checked against that list.
// That includes a saved answer, and an answer made a moment ago. The country is part of the key.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/39-revocation.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab revocation --question "What is the dose of Cardioza for Dr. Lee?" --withdraw CARDIOZA-US --naive
//   bun run lab revocation --question "What is the dose of Cardioza for Dr. Lee?" --withdraw CARDIOZA-US
//   bun run lab revocation --question "What is the dose of Cardioza for Dr. Lee?" --withdraw CARDIOZA-DE
//   bun run lab revocation --question "What is the dose of Cardioza for Dr. Lee?"
//   bun run lab revocation --question "What is the dose of Cardioza for Dr. Lee?" --late CARDIOZA-US
//   bun run lab revocation --demo

import { APPROVED_DOCS, KNOWN_DRUGS, NO_DOC } from "../src/data";
import { drugNamed, idsIn, type Hook } from "../src/claims";
import { appendLine, readLines } from "../src/jobs";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { runAgentLoop, type Tool } from "./01-agent-loop";

export type Answered = { answer: string; source: string; log: string[] };
type Saved = { key: string; answer: string };

// Answer a question, and never give a withdrawn document. Read the steps in order.
export function answerChecked(
  q: string,
  country: string,
  llm: CallLlm,
  dir: string,
  between?: Hook,
): Answered {
  const log: string[] = [];
  // Step 1: look in the cache first. The key holds the country, so a US answer never reaches Germany.
  const key = `${drugNamed(q, KNOWN_DRUGS)}|${country}`;
  const saved = findSaved(dir, key);
  if (saved !== "") {
    // Step 2: check a saved answer when we use it. A withdrawn document deletes the entry.
    if (isLive(saved, dir)) return { answer: saved, source: "cache", log };
    log.push("Step 2: the saved answer cites a withdrawn document. The entry is deleted.");
    appendLine(`${dir}/cache.jsonl`, { key, answer: "" });
  }
  // Step 3: search only the documents that are not withdrawn.
  const answer = runAgentLoop(q, country, llm, [liveSearch(dir)]).answer;
  if (between) between();
  // Step 4: check again just before sending. A withdrawal may have come in during the run.
  if (!isLive(answer, dir)) {
    log.push("Step 4: a document was withdrawn during the run. Nothing is sent.");
    return { answer: "No approved answer right now.", source: "blocked", log };
  }
  // Step 5: no cited document means no answer. Only a checked answer is saved.
  if (idsIn(answer).length === 0) return { answer, source: "none", log };
  appendLine(`${dir}/cache.jsonl`, { key, answer });
  return { answer, source: "fresh", log };
}

// Write a withdrawal in the list. It stays there, with its reason.
export function withdraw(dir: string, id: string, reason: string): void {
  appendLine(`${dir}/withdrawn.jsonl`, { id, reason });
}

export function withdrawnIds(dir: string): string[] {
  const ids: string[] = [];
  for (const line of readLines(`${dir}/withdrawn.jsonl`)) ids.push(line.id);
  return ids;
}

// True when no document in the text is withdrawn.
function isLive(text: string, dir: string): boolean {
  const blocked = withdrawnIds(dir);
  for (const id of idsIn(text)) if (blocked.includes(id)) return false;
  return true;
}

// The latest saved answer for a key. An empty text means there is none, or it was deleted.
function findSaved(dir: string, key: string): string {
  let latest = "";
  const lines: Saved[] = readLines(`${dir}/cache.jsonl`);
  for (const line of lines) if (line.key === key) latest = line.answer;
  return latest;
}

// The search tool for the loop in the agent loop. It never returns a withdrawn document.
function liveSearch(dir: string): Tool {
  return {
    name: "search_approved_docs",
    run(input) {
      const blocked = withdrawnIds(dir);
      const hits: string[] = [];
      for (const id in APPROVED_DOCS) {
        const doc = APPROVED_DOCS[id];
        const named = input.query.toLowerCase().includes(doc.drug.toLowerCase());
        const right = doc.country === input.country && named;
        const open = !blocked.includes(id);
        if (right && open) hits.push(`[${id}] ${doc.text}`);
      }
      if (hits.length === 0) return NO_DOC;
      return hits.join("\n");
    },
  };
}

// The naive way: serve the saved answer as it is. Nobody looks at the withdrawal list.
export function answerNaive(q: string, country: string, llm: CallLlm, dir: string): Answered {
  const key = `${drugNamed(q, KNOWN_DRUGS)}|${country}`;
  const saved = findSaved(dir, key);
  if (saved !== "") return { answer: saved, source: "cache", log: [] };
  const answer = runAgentLoop(q, country, llm).answer;
  appendLine(`${dir}/cache.jsonl`, { key, answer });
  return { answer, source: "fresh", log: [] };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/39-revocation");
  runLab(lab);
}
