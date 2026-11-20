import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { answerRouted } from "../../labs/23-model-routing";

function neverCalled(): never {
  throw new Error("the strong model was called");
}

// PROMISE: the small model goes first. A reply that fails our check is never sent.
// A small model that fails twice moves the job up. If the strong model fails too, nothing is sent.
test("a good small reply is sent and the strong model is never called", () => {
  const run = answerRouted("mail-contract", makeModel("ok"), neverCalled, 60);
  expect(run.tier).toBe("small");
  expect(run.answer).toContain("18000");
  expect(run.cost).toBeLessThan(run.bigOnly);
});

test("a forgotten total is fixed on the small model's second try", () => {
  const run = answerRouted("mail-contract", makeModel("nocite"), neverCalled, 60);
  expect(run.tier).toBe("small-retry");
  expect(run.answer).toContain("18000");
});

test("a made up total fails twice, moves up, and the bad reply is never sent", () => {
  const run = answerRouted("mail-contract", makeModel("invent"), makeModel("ok"), 60);
  expect(run.tier).toBe("big");
  expect(run.answer).not.toContain("19000");
  expect(run.answer).toContain("18000");
});

test("when every model fails nothing is sent", () => {
  const run = answerRouted("mail-contract", makeModel("invent"), makeModel("invent"), 60);
  expect(run.tier).toBe("refused");
  expect(run.answer).not.toContain("19000");
});
