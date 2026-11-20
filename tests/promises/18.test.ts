import { expect, test } from "bun:test";
import { makeModel, type Behaviour, type CallLlm } from "../../src/model";
import {
  answerWithCheck,
  answerWithoutCheck,
  MOST_ROUNDS,
} from "../../labs/18-reflect-and-fix";
import { dosesIn, findProblems } from "../../src/draft-check";

const DOSE = "What is the dose of Cardioza?";
const SOURCE = "[CARDIOZA-US] Cardioza standard adult dose is 10mg once daily with food.";

function run(behaviour: Behaviour, question = DOSE) {
  return answerWithCheck(question, "US", makeModel(behaviour));
}

// PROMISE: code checks every draft against the source. A fix gets two rounds at most.
// With no source there is nothing to check.
test("the check finds a wrong dose and a missing citation", () => {
  expect(findProblems("Take 10mg once daily. [CARDIOZA-US]", SOURCE)).toEqual([]);
  expect(findProblems("Take 20mg once daily. [CARDIOZA-US]", SOURCE)).toEqual(["dose 20mg is not in the source"]);
  expect(findProblems("Take 10mg once daily.", SOURCE)).toEqual(["no citation"]);
  expect(dosesIn("Take 10mg daily, or 5mg.")).toEqual(["10mg", "5mg"]);
  expect(answerWithoutCheck(DOSE, "US", makeModel("invent")).outcome).toBe("self-approved");
});

test("fixes pass the check, and the loop is capped", () => {
  expect(run("ok").outcome).toBe("accepted");
  expect(run("nocite").outcome).toBe("fixed");
  expect(run("invent").outcome).toBe("fixed");
  let fixes = 0;
  const stubborn = makeModel("stubborn");
  const counting: CallLlm = (messages, toolNames) => {
    if (messages[0].content.startsWith("FIX:")) fixes += 1;
    return stubborn(messages, toolNames);
  };
  expect(answerWithCheck(DOSE, "US", counting).outcome).toBe("gave-up");
  expect(fixes).toBe(MOST_ROUNDS);
});

test("with no source nothing is checked and no model fix is asked", () => {
  const result = run("ok", "Is Zorbex safe for children?");
  expect(result).toMatchObject({ outcome: "no-source", draft: "" });
});
