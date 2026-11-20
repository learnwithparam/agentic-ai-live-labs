// What you see on screen for the retrieval lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/12-retrieval.ts.

import { modelFrom, type Lab } from "../src/runner";
import { CHUNKS } from "../src/chunks";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { answerFromChunks, naiveRetrieve } from "../labs/12-retrieval";
import type { Hit } from "../labs/12-retrieval";
import { retrieveByMeaning } from "../src/meaning";

export const lab: Lab = {
  file: "12-retrieval.ts",
  title: "Retrieval",
  about:
    "Each example is a question about a drug. Six invented chunks are searched. Each chunk gets a score for how well it matches. Use --country DE for a German doctor, and only chunks from that country are searched.",
  terms: ["chunk", "bm25", "score", "retrieval"],
  challenge: "The model cannot read every document. If retrieval sends the wrong chunk, the model answers from the wrong source.",
  promise: "Only chunks from the doctor's country, with a strong score, are returned. Otherwise we say there is no source.",
  production: "The search ranks with BM25, a standard ranking for words. Rank by meaning too, as src/meaning.ts does with --meaning --live. Clean the data first. Filter by country and approval before the search. Log which chunk ids were sent on every answer.",
  cases: [
    { title: "NAIVE: best chunk from anywhere", why: "A German doctor asks for the dose. Two chunks match equally well and the US chunk comes first. The doctor gets the US dose.", question: "What dose of Cardioza should an adult take?", flags: { naive: "true", country: "DE" }, expect: "wrong-country" },
    { title: "A US doctor asks for a dose", why: "The right chunk matches on two words. The side effects chunk matches on only one, so it stays out.", question: "What is the dose of Cardioza?", flags: { country: "US" }, expect: "found" },
    { title: "A German doctor asks for a dose", why: "The same question gives the German chunk, because we filter by country first.", question: "What is the dose of Cardioza?", flags: { country: "DE" }, expect: "found" },
    { title: "A different topic for one drug", why: "Side effects of the same drug. The score picks the side effects chunk and not the dose chunk.", question: "What are the side effects of Cardioza?", flags: { country: "US" }, expect: "found" },
    { title: "Two drugs in one question", why: "Both drugs match, so we send two chunks. We never send more than two.", question: "Cardioza dose and Neurovex dose", flags: { country: "US" }, expect: "found" },
    { title: "Capital letters and punctuation", why: "The words are cleaned first, so shouting does not change the answer.", question: "WHAT IS THE CARDIOZA DOSE?!", flags: { country: "US" }, expect: "found" },
    { title: "A question with one matching word", why: "Only the drug name matches. One word is too weak to trust. We ask the doctor to say more.", question: "Can you tell me about Cardioza please?", flags: { country: "US" }, expect: "too-vague" },
    { title: "A drug with no chunk in this country", why: "Dermalin has only a US chunk. We never fall back to another country. We say there is no source.", question: "How do I use the Dermalin cream?", flags: { country: "DE" }, expect: "no-source" },
    { title: "Nothing to do with drugs", why: "No word matches any chunk. The answer is no source. We do not send the closest bad match.", question: "What is the weather in Berlin today?", flags: { country: "DE" }, expect: "no-source" },
  ],
  play(question, flags) {
    const country = flags.country || "US";
    print(field("Question", question));
    print(field("Doctor's country", country));
    if (flags.naive) return showNaive(question, country);
    if (flags.meaning) return showMeaning(question, country);
    const answered = answerFromChunks(question, country, CHUNKS, modelFrom(flags));
    const found = answered.found;
    rule("LOG, STEP BY STEP");
    for (const line of answered.log) console.log(dim(line));
    console.log();
    rule("CHUNKS SENT TO THE MODEL");
    for (const hit of found.hits) showHit(hit);
    if (found.outcome === "too-vague") box(badgeYellow("TOO VAGUE"), [yellow("One shared word is not enough. Ask for more detail.")], yellow);
    if (found.outcome === "no-source") box(badgeRed("NO SOURCE"), [red("Nothing matches. The agent must say it has no approved answer.")], red);
    return found.outcome;
  },
};

function showHit(hit: Hit) {
  console.log(`${badgeGreen(`${hit.words} words, score ${hit.score}`)} ${dim(`${hit.chunk.id} ${hit.chunk.country}`)} ${green(hit.chunk.text)}`);
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

// --meaning --live: rank by what the chunks mean, using a real embedding model.
function showMeaning(question: string, country: string): string {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("--meaning needs a real model. Add --live and set OPENROUTER_API_KEY.");
  const found = retrieveByMeaning(question, country, CHUNKS);
  rule("CHUNKS THAT MEAN THE SAME");
  for (const hit of found.hits) console.log(`${badgeGreen(`meaning ${hit.score}`)} ${dim(`${hit.chunk.id} ${hit.chunk.country}`)} ${green(hit.chunk.text)}`);
  if (found.outcome === "no-source") box(badgeRed("NO SOURCE"), [red("Nothing means the same as the question.")], red);
  return found.outcome;
}
