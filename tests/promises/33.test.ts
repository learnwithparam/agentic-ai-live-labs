import { expect, test } from "bun:test";
import { makeModel, type CallLlm } from "../../src/model";
import { handOff, handOffChat, handOffNaive } from "../../labs/33-handoffs";

const BOTH = "File the receipt and reply to the sender.";
const FILE = "File the receipt from FontShop.";
const ok = makeModel("ok");

// PROMISE: a message is stopped at the hop limit or on a repeat, and a person gets the path.
test("a receipt is filed with the amount from the envelope", () => {
  const done = handOff(FILE, "mail-receipt", ok);
  expect(done.outcome).toBe("delivered");
  expect(done.envelope.path).toEqual(["intake", "expense"]);
  expect(done.reply).toContain("12.5 USD");
});

test("a pasted chat log loses the amount", () => {
  expect(handOffChat(FILE, "mail-receipt").outcome).toBe("lost");
});

test("without an envelope the two bots loop", () => {
  expect(handOffNaive(BOTH, "mail-receipt", ok).outcome).toBe("looped");
});

test("a bot met twice stops the message, with a long hop limit", () => {
  const done = handOff(BOTH, "mail-receipt", ok, 10);
  expect(done.outcome).toBe("stopped");
  expect(done.reply).toContain("a loop");
  expect(done.reply).toContain("intake -> expense -> inbox");
});

test("the hop limit stops a good message that goes too far", () => {
  const done = handOff(FILE, "mail-receipt", ok, 0);
  expect(done.outcome).toBe("stopped");
  expect(done.reply).toContain("hop limit");
});

test("a name not on the list goes to a person", () => {
  const odd: CallLlm = () => ({ text: "Ask the accountant." });
  const done = handOff(FILE, "mail-receipt", odd);
  expect(done.outcome).toBe("human");
});

test("a message that fits no bot goes to a person", () => {
  const done = handOff("Please pay my parking ticket.", "mail-probe", ok);
  expect(done.outcome).toBe("human");
});

test("a reply is written by the reply bot", () => {
  const done = handOff("Reply to the client who sent the contract.", "mail-contract", ok);
  expect(done.outcome).toBe("delivered");
  expect(done.reply).toContain("18000");
});
