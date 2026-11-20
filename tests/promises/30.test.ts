import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { fileNaive, fileReceipts } from "../../labs/30-chain-and-delegate";

const ok = makeModel("ok");
const april = ["receipt-fontshop", "receipt-lunch", "receipt-cloud"];

// PROMISE: each receipt is matched to a real bank line and given a label the books use.
// A receipt that does not match is held for a person, and the others still go.
test("each receipt is matched to its own bank line and filed under the right label", () => {
  const filings = fileReceipts(april, ok);
  expect(filings[0]).toMatchObject({ filed: true, bank: "bank-1", category: "software" });
  expect(filings[2]).toMatchObject({ filed: true, bank: "bank-3", category: "hosting" });
  expect(fileNaive(april, ok)[2].bank).toBe("bank-1");
});

test("a receipt with no bank line is held, named, and the others still go", () => {
  const filings = fileReceipts(april, ok);
  expect(filings.map((filing) => filing.filed)).toEqual([true, false, true]);
  expect(filings[1].log[0]).toContain("receipt-lunch");
  expect(filings[1].log[0]).toContain("no bank line");
});

test("a label the books do not use is held", () => {
  const filings = fileReceipts(["receipt-fontshop"], makeModel("invent"));
  expect(filings[0].filed).toBe(false);
  expect(filings[0].log[0]).toContain("gadgets");
});

test("an open ended lead is capped at three workers", () => {
  const fine = fileReceipts(["receipt-cloud"], ok, true);
  expect(fine[0].filed).toBe(true);
  const runaway = fileReceipts(["receipt-cloud"], makeModel("wanders"), true);
  expect(runaway[0].filed).toBe(false);
  expect(runaway[0].log[0]).toContain("cap");
});
