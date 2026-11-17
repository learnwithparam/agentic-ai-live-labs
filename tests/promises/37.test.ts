import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { readLines } from "../../src/jobs";
import { makeModel, type CallLlm } from "../../src/model";
import { recordCase, recordNaive, reveal, tokenize } from "../../labs/37-phi-vault";

const ok = makeModel("ok");
const NOTE = "Dr. Lee says Patient: Jane Doe (SSN 123-45-6789) takes Cardioza. What is the dose?";
const TWO =
  "Dr. Lee says Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) takes Cardioza. Please confirm SSN 123-45-6789.";
const fresh = () => mkdtempSync(`${tmpdir()}/t37-`);

// PROMISE: the model sees tokens only. Same value, same token. Only a reviewer sees real values.
test("lab 37: the model never sees a real value", () => {
  const seen: string[] = [];
  const spy: CallLlm = (messages, tools) => {
    for (const message of messages) seen.push(message.content);
    return ok(messages, tools);
  };
  recordCase(NOTE, { role: "reviewer", who: "Sam" }, spy, fresh());
  expect(seen.join(" ")).not.toContain("123-45-6789");
  expect(seen.join(" ")).not.toContain("Jane Doe");
  expect(seen.join(" ")).toContain("[SSN-1]");
});

test("lab 37: a reviewer sees the real values", () => {
  const result = recordCase(NOTE, { role: "reviewer", who: "Sam" }, ok, fresh());
  expect(result.shown).toContain("123-45-6789");
  expect(result.shown).toContain("Jane Doe");
  expect(result.revealed).toBe(2);
});

test("lab 37: an agent keeps the tokens and gets no real value", () => {
  const result = recordCase(NOTE, { role: "agent", who: "Sam" }, ok, fresh());
  expect(result.shown).toContain("[SSN-1]");
  expect(result.shown).not.toContain("123-45-6789");
  expect(result.revealed).toBe(0);
});

test("lab 37: the same value gets the same token, and a new value gets a new one", () => {
  const clean = tokenize(TWO, fresh());
  expect(clean.split("[SSN-1]").length).toBe(3);
  expect(clean).toContain("[PHONE-1]");
  const dir = fresh();
  tokenize("Call 555-123-4567 now", dir);
  expect(tokenize("Call 555-987-6543 now", dir)).toContain("[PHONE-2]");
});

test("lab 37: a token made in one run is revealed in a later run", () => {
  const dir = fresh();
  tokenize(NOTE, dir);
  expect(reveal("see [SSN-1]", "reviewer", "Sam", dir).text).toBe("see 123-45-6789");
});

test("lab 37: a token the vault never made stays as it is", () => {
  const dir = fresh();
  tokenize(NOTE, dir);
  expect(reveal("see [SSN-99]", "reviewer", "Sam", dir).text).toBe("see [SSN-99]");
});

test("lab 37: every try is audited, the refused one too", () => {
  const dir = fresh();
  recordCase(NOTE, { role: "reviewer", who: "Sam" }, ok, dir);
  recordCase(NOTE, { role: "agent", who: "Alex" }, ok, dir);
  const audit = readLines(`${dir}/audit.jsonl`);
  expect(audit.length).toBe(2);
  expect(audit[0].allowed).toBe(true);
  expect(audit[1].allowed).toBe(false);
  expect(JSON.stringify(audit)).not.toContain("123-45-6789");
});

test("lab 37: a fixed mask cannot be reversed", () => {
  const result = recordNaive(NOTE, ok);
  expect(result.shown).toContain("[SSN]");
  expect(result.shown).not.toContain("123-45-6789");
});
