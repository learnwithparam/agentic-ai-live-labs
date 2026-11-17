import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { botSecret, issue } from "../../src/identity";
import { callTool, runBot, tokenFor } from "../../labs/24-identity-and-scopes";

const ask = "What is the dose of Cardioza, and can you email it to Dr. Lee?";

// PROMISE: a tool call runs only when the token is real, not expired, and lists the scope the tool needs.
test("the answer bot searches, and its email is denied", () => {
  const sent: string[] = [];
  const done = runBot(ask, tokenFor("answer", 1000), makeModel("ok"), sent, 1000);
  expect(done.find((one) => one.tool === "search_approved_docs")?.allowed).toBe(true);
  expect(done.find((one) => one.tool === "send_email")?.allowed).toBe(false);
  expect(sent.length).toBe(0);
});

test("the outreach bot may email, and the report bot may not read documents", () => {
  const sent: string[] = [];
  runBot(ask, tokenFor("outreach", 1000), makeModel("ok"), sent, 1000);
  expect(sent.length).toBe(1);
  expect(callTool(tokenFor("report", 1000), "search_approved_docs", [], 1000).allowed).toBe(false);
});

test("a changed or expired token runs nothing", () => {
  const good = tokenFor("answer", 1000);
  const body = Buffer.from(JSON.stringify({ bot: "answer", scopes: ["email.send"], expires: 2000 })).toString("base64url");
  expect(callTool(`${body}.${good.split(".")[1]}`, "send_email", [], 1000).allowed).toBe(false);
  expect(callTool(good, "search_approved_docs", [], 5000).allowed).toBe(false);
  const own = issue({ bot: "answer", scopes: ["docs.read"], expires: 2000 }, "another-secret");
  expect(callTool(own, "search_approved_docs", [], 1000).allowed).toBe(false);
  expect(botSecret().length).toBeGreaterThan(0);
});
