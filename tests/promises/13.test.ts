import { expect, test } from "bun:test";
import { costOf, pickSources, SOURCES } from "../../labs/13-pick-context";

function names(question: string): string[] {
  return pickSources(question, SOURCES).map((source) => source.name);
}

// PROMISE: a question loads only the sources whose keyword it holds.
// A question with no keyword loads nothing.
test("lab 13: each keyword loads its own source and no other", () => {
  expect(names("What is the dose?")).toEqual(["documents"]);
  expect(names("Which email came last?")).toEqual(["emails"]);
  expect(names("Who am I?")).toEqual(["profile"]);
  expect(names("My profile and the label")).toEqual(["documents", "profile"]);
  expect(names("DOSE")).toEqual(["documents"]);
});

test("lab 13: no keyword loads nothing, and picking is never dearer than loading all", () => {
  expect(names("Hello")).toEqual([]);
  expect(names("")).toEqual([]);
  for (const question of ["dose", "email", "who am i", "hello"]) {
    expect(costOf(pickSources(question, SOURCES))).toBeLessThanOrEqual(costOf(SOURCES));
  }
  expect(costOf(pickSources("email", SOURCES))).toBeLessThan(costOf(SOURCES));
});
