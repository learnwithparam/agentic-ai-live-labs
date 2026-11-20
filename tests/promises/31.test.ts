import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { makeBrief, makeBriefSlowly } from "../../labs/31-parallel-workers";

process.env.WORKER_DELAY_MS = "600";
const fresh = () => mkdtempSync(`${tmpdir()}/t31-`);
const byName = (brief: { parts: { name: string; ok: boolean; text: string }[] }, name: string) =>
  brief.parts.filter((part) => part.name === name)[0];

// PROMISE: all workers start at once. A late worker is stopped, a crashed one is named,
// and the brief goes out with the parts that came back.
test("three workers at once are faster than one after another", () => {
  const together = makeBrief("dr-lee", fresh(), {}, 6000);
  const inLine = makeBriefSlowly("dr-lee", fresh(), 20000);
  expect(together.parts.every((part) => part.ok)).toBe(true);
  expect(inLine.seconds).toBeGreaterThan(1.7);
  expect(together.seconds).toBeLessThan(inLine.seconds * 0.7);
});

test("each worker's result is its own and is right", () => {
  const brief = makeBrief("dr-lee", fresh(), {}, 6000);
  expect(byName(brief, "docs").text).toContain("CARDIOZA-US");
  expect(byName(brief, "profile").text).toContain("Dr. Lee");
  expect(byName(brief, "emails").text).toContain("launch");
});

test("a stuck worker is stopped at the deadline and the others still come", async () => {
  const dir = fresh();
  const brief = makeBrief("dr-lee", dir, { emails: "stuck" }, 2000);
  expect(brief.late).toEqual(["emails"]);
  expect(byName(brief, "emails").ok).toBe(false);
  expect(byName(brief, "docs").ok).toBe(true);
  expect(brief.seconds).toBeLessThan(4);
  await Bun.sleep(300);
  expect(Bun.spawnSync(["pgrep", "-f", dir]).exitCode).toBe(1);
});

test("a worker that crashes is named and the others still come", () => {
  const brief = makeBrief("dr-lee", fresh(), { profile: "crash" }, 6000);
  expect(byName(brief, "profile").ok).toBe(false);
  expect(brief.late).toEqual([]);
  expect(byName(brief, "docs").ok).toBe(true);
  expect(byName(brief, "emails").ok).toBe(true);
});
