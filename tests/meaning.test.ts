// Search by meaning, tested without a network. The embed function returns fixed numbers,
// so the test checks our own rules: the cut-off, the order, the country, and no source.
import { expect, test } from "bun:test";
import { cosine } from "../src/live";
import { MINIMUM_MEANING, retrieveByMeaning } from "../src/meaning";
import type { Chunk } from "../labs/12-retrieval";

const chunk = (id: string, country: string): Chunk => ({ id, country, text: `text ${id}` } as Chunk);
const CHUNKS = [chunk("A", "US"), chunk("B", "US"), chunk("C", "US"), chunk("D", "DE")];

// The question points one way. A points the same way, B is close, C and D are far or sideways.
const NUMBERS: Record<string, number[]> = {
  question: [1, 0],
  "text A": [1, 0],
  "text B": [0.8, 0.6],
  "text C": [0, 1],
  "text D": [1, 0],
};
const embed = (texts: string[]): number[][] => texts.map((text) => NUMBERS[text]);

test("cosine: same direction is 1, sideways is 0, opposite is -1", () => {
  expect(cosine([1, 0], [2, 0])).toBeCloseTo(1);
  expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  expect(cosine([1, 0], [-1, 0])).toBeCloseTo(-1);
});

test("meaning: the closest chunk comes first", () => {
  const found = retrieveByMeaning("question", "US", CHUNKS, embed);
  expect(found.outcome).toBe("found");
  expect(found.hits.map((hit) => hit.chunk.id)).toEqual(["A", "B"]);
});

test("meaning: a chunk below the cut-off is left out", () => {
  const found = retrieveByMeaning("question", "US", CHUNKS, embed);
  expect(found.hits.some((hit) => hit.chunk.id === "C")).toBe(false);
  expect(MINIMUM_MEANING).toBeGreaterThan(0);
});

test("meaning: another country's chunk is never returned, even when it matches best", () => {
  const found = retrieveByMeaning("question", "US", CHUNKS, embed);
  expect(found.hits.some((hit) => hit.chunk.id === "D")).toBe(false);
});

test("meaning: nothing close means no source", () => {
  const sideways = (texts: string[]): number[][] => texts.map((text) => (text === "question" ? [1, 0] : [0, 1]));
  expect(retrieveByMeaning("question", "US", CHUNKS, sideways).outcome).toBe("no-source");
});
