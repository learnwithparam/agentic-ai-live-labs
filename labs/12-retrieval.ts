// Lab 12: Retrieval, finding the right pieces
//
// A German doctor asks: "What is the Cardioza dose?" We cannot send every document to the model.
// So we cut the documents into small chunks, score each chunk against the question, and send only
// the best ones from the doctor's own country.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/12-retrieval.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/12-retrieval.ts --question "Cardioza dose" --naive --country DE
//   bun labs/12-retrieval.ts --question "Cardioza dose" --country US
//   bun labs/12-retrieval.ts --question "Cardioza dose" --country DE
//   bun labs/12-retrieval.ts --question "Cardioza side effects" --country US
//   bun labs/12-retrieval.ts --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";

export type Chunk = { id: string; country: string; text: string };
export type Hit = { chunk: Chunk; score: number };
export type Found = { hits: Hit[]; outcome: string };

export const MINIMUM_SCORE = 2; // a single shared word is not enough to trust a chunk
export const MOST_HITS = 2; // we send at most two chunks, to keep the prompt small

function isLetterOrDigit(letter: string): boolean {
  const isLetter = letter >= "a" && letter <= "z";
  const isDigit = letter >= "0" && letter <= "9";
  return isLetter || isDigit;
}

// Lower-case words of four letters or more. Short words like "the" and "for" tell us nothing.
export function wordsOf(text: string): string[] {
  let clean = "";
  for (const letter of text.toLowerCase()) {
    if (isLetterOrDigit(letter)) clean += letter;
    else clean += " ";
  }
  const words: string[] = [];
  for (const word of clean.split(" ")) {
    if (word.length > 3) words.push(word);
  }
  return words;
}

// The score is how many of the question's words appear in the chunk.
export function scoreChunk(question: string, chunk: Chunk): number {
  const chunkWords = wordsOf(chunk.text);
  let score = 0;
  for (const word of wordsOf(question)) {
    if (chunkWords.includes(word)) score += 1;
  }
  return score;
}

function byScore(first: Hit, second: Hit): number {
  return second.score - first.score;
}

// Only chunks from the doctor's country are even looked at. Then we keep the strong ones.
export function retrieve(question: string, country: string, chunks: Chunk[]): Found {
  const hits: Hit[] = [];
  let best = 0;
  for (const chunk of chunks) {
    if (chunk.country !== country) continue;
    const score = scoreChunk(question, chunk);
    if (score > best) best = score;
    if (score >= MINIMUM_SCORE) hits.push({ chunk, score });
  }
  if (hits.length > 0) return { hits: hits.sort(byScore).slice(0, MOST_HITS), outcome: "found" };
  if (best > 0) return { hits: [], outcome: "too-vague" };
  return { hits: [], outcome: "no-source" };
}

export type Answered = { found: Found; reply: string; log: string[] };

// Find the chunks for a question, then let the model answer from them. Read the steps in order.
export function answerFromChunks(
  question: string,
  country: string,
  chunks: Chunk[],
  callLlm: CallLlm,
): Answered {
  // Step 1: find the best chunks from the doctor's country.
  const found = retrieve(question, country, chunks);
  const log = [`Step 1: retrieval says ${found.outcome}, with ${found.hits.length} chunks.`];

  // Step 2: with no chunk we have no source, so the model is not asked at all.
  if (found.hits.length === 0) {
    log.push("Step 2: no chunk to send, so no answer is written.");
    return { found, reply: "", log };
  }

  // Step 3: the model answers from the chunks and nothing else.
  const lines: string[] = [];
  for (const hit of found.hits) lines.push(`[${hit.chunk.id}] ${hit.chunk.text}`);
  const prompt = `CHUNKS: ${question}\n${lines.join("\n")}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  const text = (reply.text || "").trim();
  log.push(`Step 2: sent ${lines.length} chunks to the model.`);
  log.push(`Step 3: the model wrote: ${text}`);
  return { found, reply: text, log };
}

// The naive way: take the single best chunk from anywhere, even a weak one from another country.
export function naiveRetrieve(question: string, chunks: Chunk[]): Hit | undefined {
  let best: Hit | undefined = undefined;
  for (const chunk of chunks) {
    const score = scoreChunk(question, chunk);
    if (best === undefined || score > best.score) best = { chunk, score };
  }
  return best;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/12-retrieval");
  runLab(lab);
}
