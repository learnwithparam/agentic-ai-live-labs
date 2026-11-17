// Retrieval, finding the right pieces
//
// A German doctor asks: "What is the Cardioza dose?" We cannot send every document to the model.
// So we cut the documents into small chunks. We score each chunk against the question.
// We send only the best ones from the doctor's own country.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/12-retrieval.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab retrieval --question "What is the dose of Cardioza?" --naive --country DE
//   bun run lab retrieval --question "What is the dose of Cardioza?" --country US
//   bun run lab retrieval --question "What is the dose of Cardioza?" --country DE
//   bun run lab retrieval --question "What are the side effects of Cardioza?" --country US
//   bun run lab retrieval --question "How much of the heart pill should an adult take?" --country US --meaning --live
//   bun run lab retrieval --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import MiniSearch from "minisearch";

export type Chunk = { id: string; country: string; text: string };
export type Hit = { chunk: Chunk; score: number; words: number };
export type Found = { hits: Hit[]; outcome: string };

export const MINIMUM_WORDS = 2; // a single shared word is not enough to trust a chunk
export const MOST_HITS = 2; // we send at most two chunks, to keep the prompt small

// Short words like "the" and "for" tell us nothing, so they are not indexed or searched.
function keepLongWords(word: string): string | null {
  if (word.length < 4) return null;
  return word.toLowerCase();
}

// A real search index. MiniSearch ranks chunks with BM25, the standard ranking for words.
function indexOf(chunks: Chunk[]): MiniSearch {
  const index = new MiniSearch({ fields: ["text"], processTerm: keepLongWords });
  index.addAll(chunks);
  return index;
}

function byId(chunks: Chunk[], id: string): Chunk {
  for (const chunk of chunks) if (chunk.id === id) return chunk;
  throw new Error(`No chunk ${id}`);
}

// Only chunks from the doctor's country are searched. Then we keep the ones that share enough words.
export function retrieve(question: string, country: string, chunks: Chunk[]): Found {
  const own: Chunk[] = [];
  for (const chunk of chunks) if (chunk.country === country) own.push(chunk);
  const results = indexOf(own).search(question, { combineWith: "OR" });

  const hits: Hit[] = [];
  for (const result of results) {
    const score = Math.round(result.score * 10) / 10;
    const words = result.terms.length;
    if (words >= MINIMUM_WORDS) hits.push({ chunk: byId(own, result.id), score, words });
  }
  if (hits.length > 0) return { hits: hits.slice(0, MOST_HITS), outcome: "found" };
  if (results.length > 0) return { hits: [], outcome: "too-vague" };
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

// The naive way: search every country and take the single best chunk, even a weak one.
export function naiveRetrieve(question: string, chunks: Chunk[]): Hit | undefined {
  const best = indexOf(chunks).search(question, { combineWith: "OR" })[0];
  if (best === undefined) return undefined;
  const words = best.terms.length;
  return { chunk: byId(chunks, best.id), score: Math.round(best.score * 10) / 10, words };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/12-retrieval");
  runLab(lab);
}
