import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { callMcpTool, discoverTools, mcpTools } from "../../labs/07-mcp-basics";

// A second, hand-made server that has one tool the real server does not have.
const OTHER_SERVER = `
for (const line of (await Bun.stdin.text()).split("\\n")) {
  if (line.trim() === "") continue;
  const message = JSON.parse(line);
  if (message.id === undefined) continue;
  let result: object = {};
  if (message.method === "tools/list") result = { tools: [{ name: "extra_tool" }] };
  if (message.method === "tools/call") result = { content: [{ type: "text", text: "extra says hi" }] };
  console.log(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }));
}
`;

// PROMISE: the agent learns its tools from the server, so a new server tool needs no agent change.
test("lab 7: tools come from the server, not from the agent", () => {
  const folder = mkdtempSync(join(tmpdir(), "lab7-"));
  const script = join(folder, "server.ts");
  writeFileSync(script, OTHER_SERVER);
  expect(discoverTools(script)).toEqual(["extra_tool"]);
  expect(mcpTools(script).map((tool) => tool.name)).toEqual(["extra_tool"]);
  expect(callMcpTool("extra_tool", {}, script)).toBe("extra says hi");
  expect(discoverTools()).toEqual(["get_hcp_profile", "search_approved_docs", "check_recent_outreach"]);
});

test("lab 7: every failure comes back as text that starts with ERROR", () => {
  expect(callMcpTool("delete_everything", {})).toStartWith("ERROR");
  expect(callMcpTool("get_hcp_profile", { hcpId: "H-9" })).toStartWith("ERROR");
  expect(callMcpTool("search_approved_docs", {}, "src/missing-server.ts")).toStartWith("ERROR");
  expect(discoverTools("src/missing-server.ts")).toEqual([]);
});
