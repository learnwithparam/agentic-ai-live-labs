// Lab 7: MCP basics
//
// Dr. Lee asks about Cardioza. Our agent has no tools of its own. It asks a server what tools it has.
// Then it uses them. MCP is the standard way to do that: messages of JSON in, messages of JSON out.
// The server is a separate program (src/mcp-server.ts). You read only the client here.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/07-mcp-basics.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/07-mcp-basics.ts --question "Cardioza dose" --naive
//   bun labs/07-mcp-basics.ts --question "(not used)" --show wire
//   bun labs/07-mcp-basics.ts --question "Cardioza dose" --hcp H-1
//   bun labs/07-mcp-basics.ts --question "Cardioza dose" --hcp H-2 --country DE
//   bun labs/07-mcp-basics.ts --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { runAgentLoop, type Tool } from "./01-agent-loop"; // the loop from lab 1

export const SERVER = "src/mcp-server.ts";

export type Asked = { answer: string; tools: string[]; log: string[] };

// Answer a question with tools that come from a server. Read the steps in order.
export function askWithMcp(
  question: string,
  country: string,
  hcp: string,
  callLlm: CallLlm,
  script = SERVER,
): Asked {
  // Step 1: ask the server what tools it has. Nothing is written into the agent.
  const tools = mcpTools(script);
  const names: string[] = [];
  for (const tool of tools) names.push(tool.name);
  const log = [`Step 1: the server has these tools: ${names.join(", ") || "none"}.`];
  if (tools.length === 0) return { answer: "", tools: names, log };

  // Step 2: run the loop from lab 1 with those tools. The model picks which to call.
  const result = runAgentLoop(question, country, callLlm, tools, 5, hcp);
  for (const line of result.log) log.push(line);
  return { answer: result.answer, tools: names, log };
}

// Every MCP message is JSON with an id, a method and some params.
export function rpc(id: number | undefined, method: string, params: object = {}) {
  return { jsonrpc: "2.0", id, method, params };
}

// The greeting every session starts with: introduce ourselves, then say we are ready.
const client = { name: "hcp-lab", version: "1" };
const hello = { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: client };
export const HELLO = [rpc(1, "initialize", hello), rpc(undefined, "notifications/initialized")];

// Send our messages to the server, one per line. Return the lines it wrote back.
// A real client keeps the server open. Here we send everything, then close, to keep it short.
export function talk(requests: object[], script = SERVER): string[] {
  let input = "";
  for (const request of requests) input += JSON.stringify(request) + "\n";
  const run = Bun.spawnSync(["bun", script], { stdin: Buffer.from(input) });
  const lines: string[] = [];
  for (const line of run.stdout.toString().split("\n")) {
    if (line.trim() !== "") lines.push(line);
  }
  return lines;
}

// Find the server's answer to the request with this id.
function findReply(lines: string[], id: number) {
  for (const line of lines) {
    const reply = JSON.parse(line);
    if (reply.id === id) return reply;
  }
  return null;
}

// Ask the server what tools it has.
export function discoverTools(script = SERVER): string[] {
  const reply = findReply(talk(HELLO.concat([rpc(2, "tools/list")]), script), 2);
  const names: string[] = [];
  if (reply === null || !reply.result) return names;
  for (const tool of reply.result.tools) names.push(tool.name);
  return names;
}

// Call one tool. Every failure comes back as text that starts with ERROR.
export function callMcpTool(name: string, args: object, script = SERVER): string {
  const call = rpc(2, "tools/call", { name, arguments: args });
  const reply = findReply(talk(HELLO.concat([call]), script), 2);
  if (reply === null) return "ERROR: the server did not answer";
  if (reply.error) return `ERROR: ${reply.error.message}`;
  const text = reply.result.content[0].text;
  if (reply.result.isError) return `ERROR: ${text}`;
  return text;
}

// Turn each tool the server lists into a Tool the loop from lab 1 can use.
function adapt(name: string, script: string): Tool {
  return { name, run(input) { return callMcpTool(name, input, script); } };
}

export function mcpTools(script = SERVER): Tool[] {
  const tools: Tool[] = [];
  for (const name of discoverTools(script)) tools.push(adapt(name, script));
  return tools;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/07-mcp-basics");
  runLab(lab);
}
