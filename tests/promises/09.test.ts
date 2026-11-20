import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { makeModel } from "../../src/model";
import { PRICES } from "../../src/team";
import { answerThrough, DOORS, findDoor, PRICES_BY_SHELL, quote, through } from "../../labs/09-three-doors";

const model = makeModel("ok");

// PROMISE: own rules answer from a function, outside apps answer over MCP, both with a source tag.
// A shell answer has no tag, so it is caught as uncited.
test("function and MCP answers carry a tag, and the shell answer is caught", () => {
  expect(through(findDoor("function")!, "logo").answer).toBe("logo: 1200 USD [price-list]");
  expect(through(findDoor("function")!, "logo").outcome).toBe("answered");
  expect(through(findDoor("mcp")!, "book_slot | thursday-3pm").outcome).toBe("answered");
  expect(through(findDoor("mcp")!, "payment_link | website").answer).toContain("9000 USD");
  const shell = through(PRICES_BY_SHELL, "logo");
  expect(shell.answer).toBe("logo 1200");
  expect(shell.outcome).toBe("uncited");
});

test("the model finds the item, and the reply keeps the tag", () => {
  const price = answerThrough(findDoor("function")!, "What does a brand kit cost?", model);
  expect(price.reply).toBe("brand-kit: 4800 USD [price-list]");
  const call = answerThrough(findDoor("mcp")!, "Book me in on Thursday at 3pm", model);
  expect(call.reply).toContain("thursday-3pm is booked");
  const repo = answerThrough(findDoor("cli")!, "Did build 3 pass?", model);
  expect(repo.reply).toContain("TypeError");
});

test("no door guesses, and a missing server is an error", () => {
  expect(through(findDoor("function")!, "mascot").outcome).toBe("no-source");
  expect(through(findDoor("cli")!, "build-9").outcome).toBe("no-source");
  expect(through(findDoor("mcp")!, "book_slot | friday").outcome).toBe("door-error");
  expect(through(findDoor("mcp")!, "book_slot | monday-10am", "src/missing-server.ts").outcome).toBe("door-error");
  expect(DOORS.length).toBe(3);
});

test("the price file in the repo is the price list", () => {
  const lines = readFileSync("sandbox/prices.txt", "utf8").trim().split("\n");
  expect(lines.length).toBe(Object.keys(PRICES).length);
  for (const line of lines) {
    const parts = line.split(" ");
    expect(quote(parts[0])).toContain(`${PRICES[parts[0]]} USD`);
  }
});
