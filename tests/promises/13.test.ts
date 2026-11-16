import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { SOURCES } from "../../src/sources";
import { costOf, pickSources } from "../../labs/13-pick-context";

function names(question: string): string[] {
  return pickSources(question, SOURCES, makeModel()).map((source) => source.name);
}

// PROMISE: a question loads only the sources the model names.
// A question that needs none loads nothing.
test("lab 13: each question loads its own source and no other", () => {
  expect(names("What is the dose?")).toEqual(["documents"]);
  expect(names("Which email came last?")).toEqual(["emails"]);
  expect(names("Who am I?")).toEqual(["profile"]);
  expect(names("My profile and the label")).toEqual(["documents", "profile"]);
  expect(names("DOSE")).toEqual(["documents"]);
});

test("lab 13: a question that needs none loads nothing, and picking is never dearer than loading all", () => {
  expect(names("Hello")).toEqual([]);
  expect(names("")).toEqual([]);
  for (const question of ["dose", "email", "who am i", "hello"]) {
    expect(costOf(pickSources(question, SOURCES, makeModel()))).toBeLessThanOrEqual(costOf(SOURCES));
  }
  expect(costOf(pickSources("email", SOURCES, makeModel()))).toBeLessThan(costOf(SOURCES));
});
