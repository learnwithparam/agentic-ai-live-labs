import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeModel } from "../../src/model";
import { countTokens, prepareRenewal, BIG_RESULT, type Phase } from "../../labs/10-context-budget";
import { prepareNaive } from "../../show/10-context-budget";
import { KEY_CLAUSE, renewalCalls, renewalContract, renewalMail } from "../../src/renewal";

function phases(): Phase[] {
  return [
    { name: "mail", result: renewalMail() },
    { name: "contract", result: renewalContract() },
    { name: "calls", result: renewalCalls() },
  ];
}

const ASK = "How much can we raise Acme's price at renewal?";

// PROMISE: our code counts the tokens, a big result becomes a receipt, old phases fold into notes
// at 40 percent of the window, and the key clause is read back from disk.
test("a big result is shown as a receipt, and the clause is still found", () => {
  process.env.NOTES_DIR = mkdtempSync(`${tmpdir()}/p10-`);
  expect(countTokens(renewalMail())).toBeGreaterThan(BIG_RESULT);
  const run = prepareRenewal(phases(), ASK, 6000, makeModel());
  expect(run.sizes[0]).toBeLessThan(BIG_RESULT);
  expect(run.reply).toBe(KEY_CLAUSE);
});

test("at 40 percent of the window the old phases fold, and the clause is still read back", () => {
  process.env.NOTES_DIR = mkdtempSync(`${tmpdir()}/p10-`);
  const run = prepareRenewal(phases(), ASK, 1200, makeModel());
  expect(run.folded).toBeGreaterThan(0);
  expect(run.reply).toBe(KEY_CLAUSE);
});

test("a window that cannot hold the prompt is refused, and the naive prompt loses the clause", () => {
  process.env.NOTES_DIR = mkdtempSync(`${tmpdir()}/p10-`);
  expect(prepareRenewal(phases(), ASK, 500, makeModel()).fits).toBe(false);
  const naive = prepareNaive(phases(), ASK, makeModel());
  expect(naive.reply).not.toBe(KEY_CLAUSE);
});
