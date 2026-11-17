import { expect, test } from "bun:test";
import { makeModel, type CallLlm } from "../../src/model";
import { handOff, handOffNaive } from "../../labs/33-handoffs";

const LOOP = "Please email Dr. Lee the dose of Cardioza.";
const DOSE = "What is the dose of Cardioza for Dr. Lee?";
const ok = makeModel("ok");

// PROMISE: a message is stopped at the hop limit or on a repeat, and a person gets the path.
test("a plain dose question is answered", () => {
  const done = handOff(DOSE, "H-1", ok);
  expect(done.outcome).toBe("delivered");
  expect(done.envelope.path).toEqual(["intake", "answer"]);
  expect(done.reply).toContain("DOC-101");
});

test("without an envelope the two bots loop", () => {
  expect(handOffNaive(LOOP, "H-1", ok).outcome).toBe("looped");
});

test("a bot met twice stops the message, with a long hop limit", () => {
  const done = handOff(LOOP, "H-1", ok, 10);
  expect(done.outcome).toBe("stopped");
  expect(done.reply).toContain("a loop");
  expect(done.reply).toContain("intake -> outreach -> answer");
});

test("the hop limit stops a good message that goes too far", () => {
  const done = handOff(DOSE, "H-1", ok, 0);
  expect(done.outcome).toBe("stopped");
  expect(done.reply).toContain("hop limit");
});

test("a name not on the list goes to a person", () => {
  const odd: CallLlm = () => ({ text: "Ask the pharmacist." });
  const done = handOff(DOSE, "H-1", odd);
  expect(done.outcome).toBe("human");
});

test("a message that fits no bot goes to a person", () => {
  const done = handOff("Please call me back about my last invoice.", "H-1", ok);
  expect(done.outcome).toBe("human");
});
