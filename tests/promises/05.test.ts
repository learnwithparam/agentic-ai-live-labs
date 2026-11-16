import { expect, test } from "bun:test";
import { callWithSchema } from "../../labs/05-tool-schemas";
import { searchSchema } from "../../src/schema";

// PROMISE: a call that fails the schema never reaches the tool.
test("lab 5: rejected calls never run the tool", () => {
  let runs = 0;
  const counter = () => {
    runs++;
    return "ran";
  };
  const bad = [
    "not json",
    "[]",
    "null",
    '{"country": "US"}',
    '{"drug": "Cardioza", "country": "FR"}',
    '{"drug": "Cardioza", "country": "US", "limit": 99}',
    '{"drug": 5, "country": "US"}',
  ];
  for (const raw of bad) expect(callWithSchema(raw, searchSchema, counter).verdict.status).toBe("rejected");
  expect(runs).toBe(0);
  callWithSchema('{"drug": "Cardioza", "country": "us"}', searchSchema, counter);
  expect(runs).toBe(1);
});
