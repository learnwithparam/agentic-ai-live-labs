import { expect, test } from "bun:test";
import { CHUNKS } from "../../src/chunks";
import { MINIMUM_WORDS, MOST_HITS, retrieve } from "../../labs/12-retrieval";

const questions = [
  "What is the dose of Cardioza?", "What are the side effects of Cardioza?", "Neurovex dose and Cardioza dose",
  "How do I use the Dermalin cream?", "Can you tell me about Cardioza please?", "What is the weather in Berlin today?", "", "WHAT IS THE CARDIOZA DOSE?!",
];

// PROMISE: only chunks from the doctor's country, with a strong score, are returned.
// Otherwise we say there is no source.
test("every hit is from the right country, strong, few and sorted", () => {
  for (const country of ["US", "DE", "FR"]) {
    for (const question of questions) {
      const found = retrieve(question, country, CHUNKS);
      expect(found.hits.length).toBeLessThanOrEqual(MOST_HITS);
      for (const hit of found.hits) {
        expect(hit.chunk.country).toBe(country);
        expect(hit.words).toBeGreaterThanOrEqual(MINIMUM_WORDS);
      }
      for (let index = 1; index < found.hits.length; index++) {
        expect(found.hits[index - 1].score).toBeGreaterThanOrEqual(found.hits[index].score);
      }
      if (found.hits.length === 0) expect(found.outcome).not.toBe("found");
    }
  }
});

test("a drug with no chunk in the country is never answered from another one", () => {
  expect(retrieve("How do I use the Dermalin cream?", "DE", CHUNKS).outcome).toBe("no-source");
  expect(retrieve("What is the dose of Cardioza?", "DE", CHUNKS).hits[0].chunk.id).toBe("C-2");
  expect(retrieve("Can you tell me about Cardioza please?", "US", CHUNKS).outcome).toBe("too-vague");
});
