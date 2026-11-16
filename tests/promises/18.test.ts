import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import {
  answerWithCheck,
  answerWithoutCheck,
  dosesIn,
  findProblems,
  MOST_ROUNDS,
  type FixDraft,
} from "../../labs/18-reflect-and-fix";
import { fixFromSource, ignoresProblems } from "../../show/18-reflect-and-fix";

const DOSE = "What is the dose of Cardioza?";
const SOURCE = "[DOC-101] Cardioza standard adult dose is 10mg once daily with food.";

function run(behaviour: "ok" | "nocite" | "invent", fixer: FixDraft = fixFromSource, question = DOSE) {
  return answerWithCheck(question, "US", makeModel(behaviour), fixer);
}

// PROMISE: code checks every draft against the source. A fix gets two rounds at most.
// With no source there is nothing to check.
test("lab 18: the check finds a wrong dose and a missing citation", () => {
  expect(findProblems("Take 10mg once daily. [DOC-101]", SOURCE)).toEqual([]);
  expect(findProblems("Take 20mg once daily. [DOC-101]", SOURCE)).toEqual(["dose 20mg is not in the source"]);
  expect(findProblems("Take 10mg once daily.", SOURCE)).toEqual(["no citation"]);
  expect(dosesIn("Take 10mg daily, or 5mg.")).toEqual(["10mg", "5mg"]);
  expect(answerWithoutCheck(DOSE, "US", makeModel("invent")).outcome).toBe("self-approved");
});

test("lab 18: fixes pass the check, and the loop is capped", () => {
  expect(run("ok").outcome).toBe("accepted");
  expect(run("nocite").outcome).toBe("fixed");
  expect(run("invent").outcome).toBe("fixed");
  let calls = 0;
  const counting: FixDraft = (draft, problems, source) => {
    calls += 1;
    return ignoresProblems(draft, problems, source);
  };
  expect(run("invent", counting).outcome).toBe("gave-up");
  expect(calls).toBe(MOST_ROUNDS);
});

test("lab 18: with no source nothing is checked and no model fix is asked", () => {
  const result = run("ok", fixFromSource, "Is Zorbex safe for children?");
  expect(result).toMatchObject({ outcome: "no-source", draft: "" });
});
