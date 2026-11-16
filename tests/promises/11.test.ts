import { expect, test } from "bun:test";
import { trimHistory, type Turn } from "../../labs/11-history-trimming";

const turns: Turn[] = [];
for (let index = 0; index < 12; index++) {
  turns.push({ text: `turn ${index}`, fact: index === 0 || index === 5 });
}

// PROMISE: pinned facts and the most recent turns always survive, in order. Nothing else does.
test("lab 11: for every limit, facts and recent turns stay and nothing else does", () => {
  for (let keep = 0; keep <= 15; keep++) {
    const result = trimHistory(turns, keep);
    const firstRecent = Math.max(0, turns.length - keep);
    const expected = turns.filter((turn, index) => turn.fact || index >= firstRecent);
    expect(result.kept).toEqual(expected);
    expect(result.dropped).toBe(turns.length - expected.length);
  }
});

test("lab 11: a negative limit acts like zero, and an empty chat stays empty", () => {
  expect(trimHistory(turns, -3).kept).toEqual(trimHistory(turns, 0).kept);
  expect(trimHistory([], 4)).toEqual({ kept: [], dropped: 0, note: "Nothing was left out." });
});
