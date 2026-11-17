import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { mergeByNpi, planNaive, planOutreach } from "../../labs/36-hcp-360";

const ok = makeModel("ok");
const LEE = "Please email Dr. Lee the new Dermalin label.";

// PROMISE: one profile by NPI. An opt-out or a contact in 7 days blocks. No NPI is never guessed.
test("the profile joins every system by NPI, and same names stay apart", () => {
  const first = mergeByNpi("1000000001");
  const second = mergeByNpi("1000000004");
  expect(first.contacts.length).toBe(3);
  expect(second.contacts.length).toBe(1);
  expect(second.contacts[0].system).toBe("inquiries");
});

test("a contact in another system blocks the email", () => {
  const result = planOutreach(LEE, "1000000004", ok);
  expect(result.verdict).toBe("blocked");
  expect(result.why).toContain("inquiries");
});

test("the naive bot reads the email system only and sends", () => {
  expect(planNaive(LEE, "1000000004", ok).verdict).toBe("sent");
});

test("a doctor who opted out is blocked, even with no recent contact", () => {
  const result = planOutreach("Please email Dr. Rao the new Neurovex label.", "1000000003", ok);
  expect(result.verdict).toBe("blocked");
  expect(result.why).toContain("opted out");
});

test("an old contact does not block, and the email is written", () => {
  const result = planOutreach("Please email Dr. Weber the new Cardioza label.", "1000000002", ok);
  expect(result.verdict).toBe("sent");
  expect(result.letter.length).toBeGreaterThan(0);
});

test("the reason names the system and the days", () => {
  const result = planOutreach("Please email Dr. Lee the new Cardioza label.", "1000000001", ok);
  expect(result.why).toContain("3 days");
});

test("a row with no NPI holds the email for a person", () => {
  const result = planOutreach("Please email Dr. Okafor the new Dermalin label.", "1000000005", ok);
  expect(result.verdict).toBe("held");
});
