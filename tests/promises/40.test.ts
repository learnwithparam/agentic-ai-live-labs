import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { readLines } from "../../src/jobs";
import { makeModel, type CallLlm } from "../../src/model";
import { verifyTrace } from "../../labs/27-traces-and-audit";
import { answerEndToEnd, answerNaive } from "../../labs/40-end-to-end";

const NOTE = "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789) on Cardioza dose";
const DOSE = "What is the dose of Cardioza for Dr. Lee?";
const fresh = () => mkdtempSync(`${tmpdir()}/t40-`);
// A model that remembers every word it was shown.
function spy() {
  const real = makeModel("ok");
  const seen: string[] = [];
  const model: CallLlm = (messages, tools) => {
    seen.push(JSON.stringify(messages));
    return real(messages, tools);
  };
  return { model, seen };
}
const yes = () => "y";
const no = () => "n";

// PROMISE: private details never reach the model. Only a checked reply goes out, or one a person
// approved. Every step is in a record that shows any edit.
test("a good note goes out, the model never sees the patient, and the record is whole", () => {
  const dir = fresh();
  const result = answerEndToEnd(NOTE, "H-1", makeModel("ok"), no, dir);
  expect(result.status).toBe("sent");
  expect(result.reply).toContain("DOC-101");
  expect(result.log.join("\n")).not.toContain("Jane Doe");
  expect(result.log.join("\n")).not.toContain("123-45-6789");
  const watched = spy();
  answerEndToEnd(NOTE, "H-1", watched.model, no, fresh());
  expect(watched.seen.length).toBeGreaterThan(0);
  expect(watched.seen.join("")).not.toContain("Jane Doe");
  expect(watched.seen.join("")).not.toContain("123-45-6789");
  expect(verifyTrace(`${dir}/record.jsonl`, result.head).ok).toBe(true);
  const kinds = readLines(`${dir}/record.jsonl`).map((line) => line.kind);
  expect(kinds).toEqual(["asked", "hid", "answered", "checked"]);
});

test("the naive way sends the reply unchecked", () => {
  const result = answerNaive(NOTE, "H-1", makeModel("nocite"));
  expect(result.status).toBe("sent-unchecked");
});

test("a reply that fails a check waits for a person, and only a yes sends it", () => {
  const bad = makeModel("nocite");
  const approved = answerEndToEnd(DOSE, "H-1", bad, yes, fresh());
  expect(approved.status).toBe("sent-after-approval");
  const refused = answerEndToEnd(DOSE, "H-1", bad, no, fresh());
  expect(refused).toMatchObject({ status: "blocked", reply: "" });
});

test("an unknown doctor gets nothing", () => {
  const dir = fresh();
  expect(answerEndToEnd(DOSE, "H-9", makeModel("ok"), yes, dir)).toMatchObject({ status: "refused", reply: "" });
});

test("an edit to the record is found", () => {
  const dir = fresh();
  const result = answerEndToEnd(NOTE, "H-1", makeModel("ok"), no, dir);
  const lines = readLines(`${dir}/record.jsonl`);
  lines[1].detail = "0 private pieces";
  Bun.write(`${dir}/record.jsonl`, lines.map((line) => JSON.stringify(line)).join("\n") + "\n");
  expect(verifyTrace(`${dir}/record.jsonl`, result.head).ok).toBe(false);
});
