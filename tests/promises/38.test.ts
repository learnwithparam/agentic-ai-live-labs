import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { checkClaims, reviewByModel } from "../../labs/38-fact-checker";

const DOSE = "Cardioza standard adult dose is 10mg once daily with food. [DOC-101]";
const GOOD = `Hello Dr. Lee. ${DOSE} Please call us with questions.`;

// PROMISE: every sentence is checked. A claim needs a citation, a document for this country,
// and the document's own words. One bad sentence blocks the email.
test("a good draft goes out, and plain talk passes", () => {
  const result = checkClaims(GOOD, "US");
  expect(result.sent).toBe(true);
  expect(result.rows.length).toBe(3);
  expect(result.rows[0].why).toBe("plain talk");
  expect(result.rows[1].why).toBe("matches DOC-101");
});

test("a claim that the document never makes is blocked", () => {
  const draft = "Hello Dr. Lee. Cardioza is safe for children under 12. [DOC-101]";
  const result = checkClaims(draft, "US");
  expect(result.sent).toBe(false);
  expect(result.rows[1].why).toBe("it does not match DOC-101");
});

test("a claim with no citation is blocked", () => {
  const result = checkClaims("Cardioza standard adult dose is 10mg once daily with food.", "US");
  expect(result.sent).toBe(false);
  expect(result.rows[0].why).toBe("no citation");
});

test("a document that does not exist is blocked", () => {
  const result = checkClaims("Cardioza standard adult dose is 10mg once daily with food. [DOC-999]", "US");
  expect(result.rows[0].why).toBe("DOC-999 is not an approved document");
});

test("a document for another country is blocked", () => {
  const result = checkClaims(`Hello Dr. Weber. ${DOSE}`, "DE");
  expect(result.sent).toBe(false);
  expect(result.rows[1].why).toBe("DOC-101 is not approved for DE");
});

test("a bad sentence at the end is found, and the good ones are not named", () => {
  const draft = `${GOOD} Cardioza also works for headaches. [DOC-101]`;
  const result = checkClaims(draft, "US");
  const bad = result.rows.filter((row) => !row.ok);
  expect(bad.length).toBe(1);
  expect(bad[0].sentence).toContain("headaches");
});

test("a number with no drug name is still a claim", () => {
  const result = checkClaims("Take 20mg every day.", "US");
  expect(result.sent).toBe(false);
});

test("the citation can sit before or after the full stop", () => {
  const draft = "Cardioza standard adult dose is 10mg once daily with food [DOC-101].";
  expect(checkClaims(draft, "US").sent).toBe(true);
});

test("asking the model sends a bad draft out", () => {
  const draft = "Cardioza is safe for children under 12. [DOC-101]";
  expect(reviewByModel(draft, makeModel("ok")).sent).toBe(true);
});
