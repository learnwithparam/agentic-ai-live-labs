import { expect, test } from "bun:test";
import { doseTool, MAX_TRIES, naiveTool, parseAsk, pretendFix, runWithFeedback } from "../../labs/16-error-feedback";

function run(question: string, naive = false) {
  return runWithFeedback(parseAsk(question), pretendFix, naive ? naiveTool : doseTool, MAX_TRIES);
}

// PROMISE: an error says what is valid, retries are capped, and a call that cannot be fixed goes to a person.
test("lab 16: errors carry a hint the model can use", () => {
  expect(doseTool({ drug: "Cardioza", country: "Germany" })).toContain("Use US or DE");
  expect(doseTool({ drug: "Cardiozza", country: "US" })).toContain("Known drugs: Cardioza");
  expect(naiveTool({ drug: "Cardioza", country: "Germany" })).toBe("ERROR");
});

test("lab 16: fixes happen, retries stop, and a changed meaning goes to a person", () => {
  expect(run("Cardioza in Germany").outcome).toBe("fixed");
  expect(run("Cardiozza in Germany")).toMatchObject({ outcome: "fixed", tries: 3 });
  expect(run("Cardioza in France").outcome).toBe("ask-person");
  expect(run("Cardioza in Germany", true)).toMatchObject({ outcome: "gave-up", tries: MAX_TRIES });
  expect(run("Dermalin in DE")).toMatchObject({ outcome: "no-source", tries: 1 });
});
