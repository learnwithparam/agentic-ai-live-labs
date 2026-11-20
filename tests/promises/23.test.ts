import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { answerRouted } from "../../labs/23-model-routing";

function neverCalled(): never {
  throw new Error("the strong model was called");
}

const ask = "What is the dose of Cardioza?";

// PROMISE: the small model answers first. An answer that fails our check is never sent.
// The strong model is asked only after a failed check. If both fail, nothing is sent.
test("a good small answer is sent and the strong model is never called", () => {
  const run = answerRouted(ask, "US", makeModel("ok"), neverCalled);
  expect(run.tier).toBe("small");
  expect(run.answer).toContain("10mg");
});

test("a missing citation or a wrong dose goes to the strong model, and the bad answer is not sent", () => {
  for (const habit of ["nocite", "invent"] as const) {
    const run = answerRouted(ask, "US", makeModel(habit), makeModel("ok"));
    expect(run.tier).toBe("big");
    expect(run.answer).not.toContain("20mg");
    expect(run.answer).toContain("CARDIOZA-US");
  }
});

test("when both fail nothing is sent, and no source means no dose is a good answer", () => {
  const both = answerRouted(ask, "US", makeModel("invent"), makeModel("invent"));
  expect(both.tier).toBe("refused");
  expect(both.answer).not.toContain("mg");
  expect(answerRouted("What is the dose of Zorbex?", "US", makeModel("ok"), neverCalled).tier).toBe("small");
});
