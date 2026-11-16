import { expect, test } from "bun:test";
import { DOORS, findDoor, through } from "../../labs/09-three-doors";

function trip(name: string, drug = "Cardioza", country = "US") {
  return through(findDoor(name)!, drug, country);
}

// PROMISE: the function door and the MCP door give the same cited answer,
// and the shell door's answer is caught as uncited.
test("lab 9: function and MCP agree, and the shell answer is caught", () => {
  expect(trip("function").answer).toBe(trip("mcp").answer);
  expect(trip("function").outcome).toBe("answered");
  expect(trip("cli").outcome).toBe("uncited");
  expect(trip("cli", "Cardioza", "DE").answer).toContain("5mg");
});

test("lab 9: no door guesses, and no door runs a hidden command", () => {
  for (const door of DOORS) expect(through(door, "Zorbex", "US").outcome).toBe("no-source");
  expect(trip("cli", "Cardioza; rm notes.txt").outcome).toBe("door-error");
});
