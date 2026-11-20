import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { fileTool, runWithFeedback } from "../../labs/16-error-feedback";
import { naiveTool } from "../../show/16-error-feedback";

const MAX_TRIES = 3;

function run(task: string, naive = false) {
  return runWithFeedback(task, makeModel(), naive ? naiveTool : fileTool, MAX_TRIES);
}

// PROMISE: an error says what is valid, retries are capped, and a receipt that fits nothing goes to a person.
test("errors carry a hint the model can use", () => {
  expect(fileTool({ receipt: "receipt-cloud", category: "cloud" })).toContain("Use one of: software");
  expect(fileTool({ receipt: "receipt-x", category: "hosting" })).toContain("Known receipts: receipt-fontshop");
  expect(naiveTool({ receipt: "receipt-cloud", category: "cloud" })).toBe("ERROR");
});

test("fixes happen, retries stop, and an unfit receipt goes to a person", () => {
  expect(run("File the Acme client lunch.").outcome).toBe("fixed");
  expect(run("File the font licence receipt.")).toMatchObject({ outcome: "fixed", tries: 3 });
  expect(run("File the team gift cards.").outcome).toBe("ask-person");
  const naive = run("File the font licence receipt.", true);
  expect(naive).toMatchObject({ outcome: "gave-up", tries: MAX_TRIES });
  expect(naive.log.length).toBe(MAX_TRIES);
  expect(run("File the cloud hosting bill as hosting.")).toMatchObject({ outcome: "answered", tries: 1 });
});
