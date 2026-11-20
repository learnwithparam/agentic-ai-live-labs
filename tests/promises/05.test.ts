import { expect, test } from "bun:test";
import { bookWithSchema, callWithSchema } from "../../labs/05-tool-schemas";
import { makeModel } from "../../src/model";
import { expenseSchema } from "../../src/schema";
import { RECEIPTS } from "../../src/team";

const signIn = { country: "US" };
const good = { amount: 12.5, currency: "USD", date: "2026-04-03", category: "software", country: "US" };

function check(raw: string, run = () => "ran") {
  return callWithSchema(raw, expenseSchema, run, signIn);
}

// PROMISE: a call that fails the schema never reaches the books.
// The country comes from the sign-in, never from the chat.
test("rejected calls never run the tool", () => {
  let runs = 0;
  const counter = () => {
    runs++;
    return "ran";
  };
  const bad = [
    "not json",
    "[]",
    "null",
    JSON.stringify({ ...good, amount: "twelve fifty" }),
    JSON.stringify({ ...good, date: "03/04" }),
    JSON.stringify({ ...good, date: "2026-02-30" }),
    JSON.stringify({ ...good, currency: "FRF" }),
    JSON.stringify({ ...good, category: "gift basket" }),
    JSON.stringify({ ...good, amount: 100000 }),
    JSON.stringify({ amount: 12.5, currency: "USD", category: "software" }),
  ];
  for (const raw of bad) expect(check(raw, counter).verdict.status).toBe("rejected");
  expect(runs).toBe(0);
  check(JSON.stringify(good), counter);
  expect(runs).toBe(1);
});

test("small safe slips are repaired and noted", () => {
  const slips = JSON.stringify({ ...good, amount: "12.50", currency: "$" });
  const result = check(slips);
  expect(result.verdict.status).toBe("repaired");
  expect(result.verdict.args.amount).toBe(12.5);
  expect(result.verdict.args.currency).toBe("USD");
  const lunch = check(JSON.stringify({ ...good, category: "client lunch" }));
  expect(lunch.verdict.args.category).toBe("meals");
});

test("the country comes from the sign-in", () => {
  const result = check(JSON.stringify({ ...good, country: "DE" }));
  expect(result.verdict.args.country).toBe("US");
  expect(result.verdict.notes.join(" ")).toContain("sign-in");
  expect(callWithSchema(JSON.stringify(good), expenseSchema, () => "ran", {}).verdict.status).toBe("rejected");
});

test("the model's call for each receipt is checked, not trusted", () => {
  const verdicts: Record<string, string> = {};
  for (const receipt of RECEIPTS) {
    verdicts[receipt.id] = bookWithSchema(receipt.text, makeModel("ok"), signIn).verdict.status;
  }
  expect(verdicts["receipt-fontshop"]).toBe("rejected");
  expect(verdicts["receipt-lunch"]).toBe("repaired");
  expect(verdicts["receipt-cloud"]).toBe("repaired");
});
