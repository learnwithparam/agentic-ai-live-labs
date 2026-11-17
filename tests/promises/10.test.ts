import { expect, test } from "bun:test";
import { buildPrompt, countTokens, type Part } from "../../labs/10-context-budget";

const parts: Part[] = [
  { name: "rules", text: "Use only approved documents. Cite ids.", must: true },
  { name: "doctor", text: "Dr. Lee, US.", must: false },
  { name: "documents", text: "x".repeat(200), must: false },
  { name: "history", text: "y".repeat(300), must: false },
  { name: "question", text: "Cardioza dose?", must: true },
];

// PROMISE: the prompt never passes the budget, and the rules and the question are never dropped.
test("lab 10: every budget gives a prompt that fits, with the must parts inside", () => {
  for (let budget = 0; budget <= 400; budget++) {
    const built = buildPrompt(parts, budget);
    if (!built.fits) {
      expect(built.prompt).toBe("");
      continue;
    }
    expect(countTokens(built.prompt)).toBeLessThanOrEqual(budget);
    expect(built.kept).toContain("rules");
    expect(built.kept).toContain("question");
  }
});

test("lab 10: below the must parts the answer is too small, never a cut prompt", () => {
  expect(buildPrompt(parts, 5).fits).toBe(false);
  expect(buildPrompt(parts, 400).dropped).toEqual([]);
});
