import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeModel } from "../../src/model";
import { answerWithTrace, seal, verifyTrace } from "../../labs/27-traces-and-audit";

const ask = "What is the dose of Cardioza?";

function fresh() {
  const file = `${mkdtempSync(`${tmpdir()}/t27-`)}/trace.jsonl`;
  const traced = answerWithTrace(ask, "dr-weber", makeModel("ok"), file);
  return { file, head: traced.head };
}

function lines(file: string): string[] {
  return readFileSync(file, "utf8").split("\n").filter((line) => line.trim() !== "");
}

// PROMISE: any edit, removed line, cut end or full rewrite is found when we check against the head.
test("an untouched trace is intact, and it records question, search, result and answer", () => {
  const { file, head } = fresh();
  expect(verifyTrace(file, head).ok).toBe(true);
  const kinds = lines(file).map((line) => JSON.parse(line).kind);
  expect(kinds).toEqual(["question", "tool call", "tool result", "answer"]);
});

test("a changed word is caught at its line", () => {
  const { file, head } = fresh();
  const all = lines(file);
  all[2] = all[2].replace("CARDIOZA-DE", "CARDIOZA-US");
  writeFileSync(file, all.join("\n") + "\n");
  const checked = verifyTrace(file, head);
  expect(checked.ok).toBe(false);
  expect(checked.line).toBe(3);
});

test("a removed line is caught", () => {
  const { file, head } = fresh();
  const all = lines(file);
  all.splice(1, 1);
  writeFileSync(file, all.join("\n") + "\n");
  expect(verifyTrace(file, head).ok).toBe(false);
});

test("a cut end is caught only by the saved head", () => {
  const { file, head } = fresh();
  const all = lines(file);
  all.pop();
  writeFileSync(file, all.join("\n") + "\n");
  expect(verifyTrace(file, head).ok).toBe(false);
  expect(verifyTrace(file, JSON.parse(all[all.length - 1]).hash).ok).toBe(true);
});

test("a full rewrite with new fingerprints is caught by the saved head", () => {
  const { file, head } = fresh();
  let prev = "START";
  const rewritten: string[] = [];
  for (const line of lines(file)) {
    const old = JSON.parse(line);
    const detail = old.detail.replace("CARDIOZA-DE", "CARDIOZA-US");
    const entry = seal(prev, old.n, old.kind, detail);
    rewritten.push(JSON.stringify(entry));
    prev = entry.hash;
  }
  writeFileSync(file, rewritten.join("\n") + "\n");
  expect(verifyTrace(file, prev).ok).toBe(true);
  expect(verifyTrace(file, head).ok).toBe(false);
});

test("a removed line is caught even when the next line's pointers are repaired", () => {
  const { file, head } = fresh();
  const all = lines(file);
  const third = JSON.parse(all[2]);
  third.n = 2;
  third.prev = JSON.parse(all[0]).hash;
  const forged = [all[0], JSON.stringify(third), all[3]];
  writeFileSync(file, forged.join("\n") + "\n");
  const checked = verifyTrace(file, head);
  expect(checked.ok).toBe(false);
  expect(checked.line).toBe(2);
});

test("a line copied in from another trace does not fit, even with its pointer repaired", () => {
  const a = fresh();
  const other = `${mkdtempSync(`${tmpdir()}/t27-`)}/trace.jsonl`;
  const b = answerWithTrace(ask, "dr-lee", makeModel("ok"), other);
  const mine = lines(a.file);
  const spliced = JSON.parse(lines(other)[3]);
  spliced.prev = JSON.parse(mine[2]).hash;
  writeFileSync(a.file, [mine[0], mine[1], mine[2], JSON.stringify(spliced)].join("\n") + "\n");
  expect(verifyTrace(a.file, b.head).ok).toBe(false);
});
