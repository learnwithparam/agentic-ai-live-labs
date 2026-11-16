// LAB 7: MCP BASICS
//
// Read PART 1. MCP lets an agent ask a SERVER what tools it has, then call them.
// The server is a separate program (src/mcp-server.ts). You read only the CLIENT here.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it:   bun run lab 7            (a menu of examples)
//           bun run lab 7 --demo     (every edge case, with a reason for each)
//           bun run lab 7 --naive    (the same menu, with a hard-coded tool list)

import { CRM } from "../src/data";
import { modelFrom, runLab, type Lab } from "../src/runner";
import { badgeBlue, bold, box, cyan, dim, field, green, highlight, print, red, rule, yellow } from "../src/ui";
import { runAgentLoop, searchOnly, type Tool } from "./01-agent-loop"; // the loop from lab 1

// PART 1: THE CORE LOGIC

export const SERVER = "src/mcp-server.ts";

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

// PART 2: HOW IT IS SHOWN (you can skip this)

export const lab: Lab = {
  file: "07-mcp-basics.ts",
  title: "Lab 7: MCP basics",
  about:
    "The agent from lab 1 gets its tools from a real MCP server, started as a separate program. Nothing is hard-coded. Use --hcp H-1, H-2 or H-3 to pick the doctor.",
  terms: "MCP = a standard way for an agent to find and call tools. server = the program that owns the tools. JSON-RPC = the message format.",
  challenge: "Every new tool means new glue code in every agent. Tool lists go out of date.",
  promise: "The agent learns its tools from the server, so a new server tool needs no agent change.",
  production: "Use the official MCP SDK, keep the server running, and add sign-in and a time limit to every call.",
  cases: [
    { title: "NAIVE: a hard-coded tool list", why: "The agent copied one tool into its own code. The server has more. The agent cannot use them, and nobody gets an error.", question: "Cardioza dose", flags: { naive: "true" }, expect: "out-of-date" },
    { title: "See the messages", why: "This is all MCP is: lines of JSON in, lines of JSON out. Read the method names and the tool list.", question: "(not used)", flags: { show: "wire" }, expect: "listed" },
    { title: "The agent uses the server's tools", why: "The agent finds three tools, then calls them one by one. The answer cites its document.", question: "Cardioza dose", flags: { hcp: "H-1" }, expect: "answered" },
    { title: "Another country", why: "Same server, a German doctor. The search tool filters by country, so the dose is 5mg.", question: "Cardioza dose", flags: { hcp: "H-2", country: "DE" }, expect: "answered" },
    { title: "No approved document", why: "The server says nothing was found. The agent refuses to guess.", question: "Zorbex dose", expect: "no-source" },
    { title: "A tool reports an error", why: "Doctor H-9 does not exist. The server marks the result as an error, and the client passes it on as text.", question: "Cardioza dose", flags: { hcp: "H-9" }, expect: "tool-error" },
    { title: "A tool the server does not have", why: "The agent asks for delete_everything. The server answers with a protocol error. The call goes nowhere.", question: "anything", flags: { tool: "delete_everything" }, expect: "tool-error" },
    { title: "The server is not there", why: "The path is wrong, so nothing answers. The client finds no tools and says so, instead of hanging.", question: "Cardioza dose", flags: { script: "src/missing-server.ts" }, expect: "no-server" },
  ],
  play(question, flags) {
    const script = flags.script || SERVER;
    const hcpId = flags.hcp || "H-1";
    const country = flags.country || (CRM[hcpId] ? CRM[hcpId].country : "US");
    if (flags.naive) return showNaive(script);
    if (flags.show === "wire") return showWire(script);
    if (flags.tool) {
      const result = callMcpTool(flags.tool, { query: question, country, hcpId }, script);
      print(field("call", flags.tool, cyan));
      print(field("result", result, result.startsWith("ERROR") ? red : green));
      return result.startsWith("ERROR") ? "tool-error" : "ran";
    }
    const tools = mcpTools(script);
    print(field("Server", script));
    if (tools.length === 0) {
      box("NO SERVER", [red("No tools were found. Is the server there?")], red);
      return "no-server";
    }
    print(field("Tools", tools.map((tool) => tool.name).join(", "), cyan));
    const result = runAgentLoop(question, country, modelFrom(flags), tools, 5, hcpId);
    let failed = false;
    for (const [index, step] of result.steps.entries()) {
      if (step.kind === "answer") continue;
      if (step.result.startsWith("ERROR")) failed = true;
      console.log(`${badgeBlue(`STEP ${index + 1}`)} ${bold(step.tool)}`);
      print(field("  result", highlight(step.result), step.result.startsWith("ERROR") ? red : dim));
    }
    console.log();
    if (failed) {
      box("A TOOL FAILED", [yellow(result.answer)], yellow);
      return "tool-error";
    }
    const cited = result.answer.includes("[DOC-");
    box(cited ? "ANSWER" : "NO APPROVED SOURCE", field("", highlight(result.answer), cited ? green : yellow, 0), cited ? green : yellow);
    return cited ? "answered" : "no-source";
  },
};

function showNaive(script: string): string {
  const fixed = searchOnly.map((tool) => tool.name);
  const real = discoverTools(script);
  print(field("hard-coded", fixed.join(", "), yellow));
  print(field("on server", real.join(", "), cyan));
  const missing = real.filter((name) => !fixed.includes(name));
  box("OUT OF DATE", [yellow(`The agent cannot use: ${missing.join(", ")}`)], yellow);
  return missing.length > 0 ? "out-of-date" : "same";
}

function showWire(script: string): string {
  const requests = HELLO.concat([rpc(2, "tools/list")]);
  rule("WE SEND");
  for (const request of requests) console.log(dim(JSON.stringify(request).slice(0, 90)));
  rule("THE SERVER ANSWERS");
  for (const line of talk(requests, script)) console.log(highlight(line.slice(0, 90)) + dim(" ..."));
  return "listed";
}

if (import.meta.main) runLab(lab);
