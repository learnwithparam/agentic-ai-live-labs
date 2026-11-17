// Search by meaning. The retrieval lab ranks chunks by shared words. This ranks them by what they mean.
// Ask how much of the heart pill an adult should take.
// No word matches the Cardioza dose chunk. The meaning does, so the two embeddings are close.
// It needs a real embedding model, so it runs only with --meaning --live.
import type { Chunk, Found, Hit } from "../labs/12-retrieval";
import { MOST_HITS } from "../labs/12-retrieval";
import { cosine, embedTexts } from "./live";

export const MINIMUM_MEANING = 0.4; // below this, a chunk is about something else

export type Embed = (texts: string[]) => number[][];

export function retrieveByMeaning(
  question: string,
  country: string,
  chunks: Chunk[],
  embed: Embed = embedTexts,
): Found {
  const own: Chunk[] = [];
  for (const chunk of chunks) if (chunk.country === country) own.push(chunk);
  const texts = [question];
  for (const chunk of own) texts.push(chunk.text);
  const vectors = embed(texts);
  const hits: Hit[] = [];
  for (let i = 0; i < own.length; i++) {
    const score = Math.round(cosine(vectors[0], vectors[i + 1]) * 100) / 100;
    if (score >= MINIMUM_MEANING) hits.push({ chunk: own[i], score, words: 0 });
  }
  hits.sort((first, second) => second.score - first.score);
  if (hits.length === 0) return { hits, outcome: "no-source" };
  return { hits: hits.slice(0, MOST_HITS), outcome: "found" };
}
