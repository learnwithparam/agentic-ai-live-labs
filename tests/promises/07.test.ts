import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { askInbox, askNaive, callMcpTool, discoverTools, listAllTools } from "../../labs/07-mcp-basics";
import { serverFor, TOP } from "../../labs/07-mcp-basics";
import { HELLO, rankTools } from "../../src/mcp-client";

const model = makeModel("ok");

// PROMISE: the model sees at most two tools, and each call goes to the server that owns the tool.
test("the model sees two tools and the call goes to the right server", () => {
  const asked = askInbox("Who is Dana on Slack?", model);
  expect(asked.shown.length).toBeLessThanOrEqual(TOP);
  expect(asked.shown[0]).toBe("slack_get_user");
  expect(asked.answer).toBe("Dana Reyes, designer, @dana");
  expect(askInbox("Find the signed contract email", model).answer).toBe("mail-contract: Signed contract");
  expect(askInbox("Who owns the brand guide file?", model).answer).toBe("Maya");
});

test("the naive way sends the call to the wrong server", () => {
  const naive = askNaive("Who is Dana on Slack?", model);
  expect(naive.outcome).toBe("wrong-server");
  expect(naive.answer).toStartWith("ERROR");
  const smart = askInbox("Who is Dana on Slack?", model);
  expect(naive.tokens).toBeGreaterThan(smart.tokens);
});

test("small talk sends no tools", () => {
  const asked = askInbox("Hello there", model);
  expect(asked.outcome).toBe("no-tools");
  expect(asked.shown).toEqual([]);
});

test("tools come from the servers, and names are prefixed", () => {
  const all = listAllTools();
  expect(all.length).toBe(6);
  const names: string[] = [];
  for (const tool of all) names.push(tool.full);
  expect(names).toContain("slack_get_user");
  expect(names).toContain("drive_search");
  expect(rankTools("Who is Dana on Slack?", all, 1)[0].full).toBe("slack_get_user");
  expect(discoverTools("src/missing-server.ts")).toEqual([]);
  expect(askInbox("Who is Dana on Slack?", model, "src/missing-server.ts").outcome).toBe("no-server");
});

test("every failure comes back as text that starts with ERROR", () => {
  expect(callMcpTool("delete_everything", {}, serverFor("slack"))).toStartWith("ERROR");
  expect(callMcpTool("get_user", { text: "nobody" }, serverFor("slack"))).toStartWith("ERROR");
  expect(callMcpTool("search", {}, "src/missing-server.ts")).toStartWith("ERROR");
});

// PROMISE: the server answers while the input is still open, as a real MCP client expects.
test("the server replies before the input closes", async () => {
  const child = Bun.spawn(["bun", "src/mcp-server.ts", "slack"], { stdin: "pipe", stdout: "pipe" });
  child.stdin.write(JSON.stringify(HELLO[0]) + "\n");
  child.stdin.flush();
  const reader = child.stdout.getReader();
  const first = await reader.read();
  const reply = JSON.parse(new TextDecoder().decode(first.value));
  expect(reply.result.serverInfo.name).toBe("juniper-slack");
  child.stdin.end();
  await child.exited;
});
