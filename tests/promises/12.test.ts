import { expect, test } from "bun:test";
import { CHUNKS } from "../../src/chunks";
import { MINIMUM_SCORE, MOST_HITS, retrieve } from "../../labs/12-retrieval";

const questions = [
  "What is the dose of Cardioza?", "Cardioza side effects", "Neurovex dose and Cardioza dose",
  "Dermalin cream use", "Cardioza please", "weather in Berlin", "", "WHAT IS THE CARDIOZA DOSE?!",
];

// PROMISE: only chunks from the doctor's country, with a strong score, are returned.
// Otherwise we say there is no source.
test("lab 12: every hit is from the right country, strong, few and sorted", () => {
  for (const country of ["US", "DE", "FR"]) {
    for (const question of questions) {
      const found = retrieve(question, country, CHUNKS);
      expect(found.hits.length).toBeLessThanOrEqual(MOST_HITS);
      for (const hit of found.hits) {
        expect(hit.chunk.country).toBe(country);
        expect(hit.score).toBeGreaterThanOrEqual(MINIMUM_SCORE);
      }
      for (let index = 1; index < found.hits.length; index++) {
        expect(found.hits[index - 1].score).toBeGreaterThanOrEqual(found.hits[index].score);
      }
      if (found.hits.length === 0) expect(found.outcome).not.toBe("found");
    }
  }
});

test("lab 12: a drug with no chunk in the country is never answered from another one", () => {
  expect(retrieve("Dermalin cream use", "DE", CHUNKS).outcome).toBe("no-source");
  expect(retrieve("What is the dose of Cardioza?", "DE", CHUNKS).hits[0].chunk.id).toBe("C-2");
  expect(retrieve("Cardioza please", "US", CHUNKS).outcome).toBe("too-vague");
});
