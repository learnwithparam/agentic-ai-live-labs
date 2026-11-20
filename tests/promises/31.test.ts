import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeBrief, makeBriefSlowly, writeNote } from "../../labs/31-parallel-workers";

process.env.WORKER_DELAY_MS = "600";
const fresh = () => mkdtempSync(`${tmpdir()}/t31-`);
const byName = (brief: { parts: { name: string; ok: boolean; text: string }[] }, name: string) =>
  brief.parts.filter((part) => part.name === name)[0];

// PROMISE: all workers start at once. A late worker is stopped, a crashed one is named,
// and one writer merges the parts that came back.
test("four workers at once are faster than one after another", () => {
  const together = makeBrief("prospect-bakery", fresh(), {}, 6000);
  const inLine = makeBriefSlowly("prospect-bakery", fresh(), 20000);
  expect(together.parts.every((part) => part.ok)).toBe(true);
  expect(inLine.seconds).toBeGreaterThan(2.2);
  expect(together.seconds).toBeLessThan(inLine.seconds * 0.7);
}, 20000);

test("each worker's result is its own and is right", () => {
  const brief = makeBrief("prospect-bakery", fresh(), {}, 6000);
  expect(byName(brief, "site").text).toContain("no online orders");
  expect(byName(brief, "social").text).toContain("twice a week");
  expect(byName(brief, "pricing").text).toContain("6 dollars");
  expect(byName(brief, "clients").text).toContain("schools");
});

test("a stuck worker is stopped at the deadline and the others still come", async () => {
  const dir = fresh();
  const brief = makeBrief("prospect-bakery", dir, { social: "stuck" }, 2000);
  expect(brief.late).toEqual(["social"]);
  expect(byName(brief, "social").ok).toBe(false);
  expect(byName(brief, "site").ok).toBe(true);
  expect(brief.seconds).toBeLessThan(4);
  expect(writeNote(brief)).toContain("social: missing, too slow");
  await Bun.sleep(300);
  expect(Bun.spawnSync(["pgrep", "-f", dir]).exitCode).toBe(1);
});

test("a worker that crashes is named and the others still come", () => {
  const brief = makeBrief("prospect-bakery", fresh(), { pricing: "crash" }, 6000);
  expect(byName(brief, "pricing").ok).toBe(false);
  expect(brief.late).toEqual([]);
  expect(byName(brief, "site").ok).toBe(true);
  expect(writeNote(brief)).toContain("pricing: missing");
});
