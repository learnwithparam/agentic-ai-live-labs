// LAB 12: RETRIEVAL, FINDING THE RIGHT PIECES
//
// Read PART 1. We cannot send every document to the model. We cut them into small chunks,
// score each chunk against the question, and send only the best ones from the right country.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun run lab 12 --question "Cardioza dose" --naive --country DE
//   bun run lab 12 --question "Cardioza dose" --country US
//   bun run lab 12 --question "Cardioza dose" --country DE
//   bun run lab 12 --question "Cardioza side effects" --country US
//   bun run lab 12 --demo

import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";

// PART 1: THE CORE LOGIC

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

// The NAIVE way: take the single best chunk from anywhere, even a weak one from another country.
export function naiveRetrieve(question: string, chunks: Chunk[]): Hit | undefined {
  let best: Hit | undefined = undefined;
  for (const chunk of chunks) {
    const score = scoreChunk(question, chunk);
    if (best === undefined || score > best.score) best = { chunk, score };
  }
  return best;
}

// PART 2: HOW IT IS SHOWN (you can skip this)

export const CHUNKS: Chunk[] = [
  { id: "C-1", country: "US", text: "Cardioza dose for adults is 10mg once daily with food." },
  { id: "C-2", country: "DE", text: "Cardioza dose for adults is 5mg once daily in the morning." },
  { id: "C-3", country: "US", text: "Cardioza side effects include dizziness and a dry cough." },
  { id: "C-4", country: "US", text: "Neurovex dose for migraine is 50mg at the first sign of pain." },
  { id: "C-5", country: "US", text: "Neurovex storage: keep tablets below 25 degrees in a dry place." },
  { id: "C-6", country: "US", text: "Dermalin cream use: twice daily on clean dry skin." },
];

export const lab: Lab = {
  file: "12-retrieval.ts",
  title: "Lab 12: retrieval",
  about:
    "Each example is a question about a drug. Six invented chunks are searched. Use --country DE for a German doctor. Only chunks from the doctor's country are searched.",
  terms: "chunk = a small piece of a document. score = how well a chunk matches the question. retrieval = finding the best chunks to send.",
  challenge: "The model cannot read every document. If we send the wrong chunk, it answers from the wrong source.",
  promise: "Only chunks from the doctor's country, with a strong score, are returned. Otherwise we say there is no source.",
  production: "Score with embeddings as well as words, and log which chunk ids were sent on every answer.",
  cases: [
    { title: "NAIVE: best chunk from anywhere", why: "A German doctor asks for the dose. Two chunks match equally well and the US chunk comes first. The doctor gets the US dose.", question: "Cardioza dose", flags: { naive: "true", country: "DE" }, expect: "wrong-country" },
    { title: "A US doctor asks for a dose", why: "The right chunk matches on two words. The side effects chunk matches on only one, so it stays out.", question: "Cardioza dose", flags: { country: "US" }, expect: "found" },
    { title: "A German doctor asks for a dose", why: "The same question gives the German chunk, because we filter by country first.", question: "Cardioza dose", flags: { country: "DE" }, expect: "found" },
    { title: "A different topic for one drug", why: "Side effects of the same drug. The score picks the side effects chunk and not the dose chunk.", question: "Cardioza side effects", flags: { country: "US" }, expect: "found" },
    { title: "Two drugs in one question", why: "Both drugs match, so we send two chunks. We never send more than two.", question: "Cardioza dose and Neurovex dose", flags: { country: "US" }, expect: "found" },
    { title: "Capital letters and punctuation", why: "The words are cleaned first, so shouting does not change the answer.", question: "CARDIOZA DOSE?!", flags: { country: "US" }, expect: "found" },
    { title: "A question with one matching word", why: "Only the drug name matches. One word is too weak to trust. We ask the doctor to say more.", question: "Cardioza please", flags: { country: "US" }, expect: "too-vague" },
    { title: "A drug with no chunk in this country", why: "Dermalin has only a US chunk. We never fall back to another country. We say there is no source.", question: "Dermalin cream use", flags: { country: "DE" }, expect: "no-source" },
    { title: "Nothing to do with drugs", why: "No word matches any chunk. The answer is no source. We do not send the closest bad match.", question: "weather in Berlin", flags: { country: "DE" }, expect: "no-source" },
  ],
  play(question, flags) {
    const country = flags.country || "US";
    print(field("Question", question));
    print(field("Doctor's country", country));
    if (flags.naive) return showNaive(question, country);
    const found = retrieve(question, country, CHUNKS);
    rule("CHUNKS SENT TO THE MODEL");
    for (const hit of found.hits) showHit(hit);
    if (found.outcome === "too-vague") box(badgeYellow("TOO VAGUE"), [yellow("One shared word is not enough. Ask for more detail.")], yellow);
    if (found.outcome === "no-source") box(badgeRed("NO SOURCE"), [red("Nothing matches. The agent must say it has no approved answer.")], red);
    return found.outcome;
  },
};

function showHit(hit: Hit) {
  console.log(`${badgeGreen(`score ${hit.score}`)} ${dim(`${hit.chunk.id} ${hit.chunk.country}`)} ${green(hit.chunk.text)}`);
}

function showNaive(question: string, country: string): string {
  const hit = naiveRetrieve(question, CHUNKS);
  rule("THE ONE CHUNK SENT");
  if (hit === undefined) return "no-source";
  showHit(hit);
  if (hit.chunk.country === country) return "found";
  box(badgeRed("WRONG COUNTRY"), [red(`A ${hit.chunk.country} chunk was sent to a ${country} doctor.`)], red);
  return "wrong-country";
}

if (import.meta.main) runLab(lab);
// Run it (copy any line):
//   bun run lab 12 --question "Cardioza dose" --naive --country DE
//   bun run lab 12 --question "Cardioza dose" --country US
//   bun run lab 12 --question "Cardioza dose" --country DE
//   bun run lab 12 --question "Cardioza side effects" --country US
//   bun run lab 12 --demo