import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { EVALS, decide, runEvals, shipIfItRuns } from "../../labs/28-evals-and-release";

const model = makeModel("ok");

// PROMISE: a version ships only when every eval passes. A failed eval blocks it. No evals blocks it.
test("the current version passes every eval and ships", () => {
  const decision = decide(runEvals("current", EVALS, model));
  expect(decision.release).toBe(true);
});

test("the wide version fails Dr. Weber's question and is blocked", () => {
  const results = runEvals("wide", EVALS, model);
  const decision = decide(results);
  expect(decision.release).toBe(false);
  expect(decision.failed.length).toBe(1);
  expect(decision.failed[0].hcp).toBe("dr-weber");
  expect(shipIfItRuns(results).release).toBe(true);
});

test("the version that makes up a document fails the unknown drug question", () => {
  const decision = decide(runEvals("invents", EVALS, model));
  expect(decision.release).toBe(false);
  expect(decision.failed[0].ask).toContain("Zorbex");
});

test("an empty eval set blocks the release", () => {
  expect(decide(runEvals("current", [], model)).release).toBe(false);
});

test("both kinds of fact are checked on their own", () => {
  const ask = "What is the dose of Cardioza?";
  const lacks = [{ ask, hcp: "dr-lee", mustHave: ["FAKE-LABEL"], mustNot: [] }];
  expect(decide(runEvals("current", lacks, model)).release).toBe(false);
  const holds = [{ ask, hcp: "dr-weber", mustHave: [], mustNot: ["CARDIOZA-US"] }];
  expect(decide(runEvals("wide", holds, model)).release).toBe(false);
  expect(decide(runEvals("current", holds, model)).release).toBe(true);
});
