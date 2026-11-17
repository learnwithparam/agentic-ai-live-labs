// A TINY MCP SERVER. You do not need to read this file. Lab 7 reads the CLIENT side.
// MCP is JSON messages over standard input and output, one message per line.
// This server knows four methods: initialize, tools/list, tools/call and one notification.
// It answers each line as soon as it arrives, and exits when the input ends.
import { searchApprovedDocs } from "../labs/01-agent-loop";
import { CRM, EMAILS } from "./data";

const text = { type: "string" };
const TOOLS = [
  {
    name: "get_hcp_profile",
    description: "Look up a doctor in the CRM.",
    inputSchema: { type: "object", properties: { hcpId: text }, required: ["hcpId"] },
  },
  {
    name: "search_approved_docs",
    description: "Search approved documents for a drug and country.",
    inputSchema: { type: "object", properties: { query: text, country: text }, required: ["query", "country"] },
  },
  {
    name: "check_recent_outreach",
    description: "List recent emails sent to a doctor.",
    inputSchema: { type: "object", properties: { hcpId: text }, required: ["hcpId"] },
  },
];

type Outcome = { text: string; isError: boolean };

function callTool(name: string, args: Record<string, string>): Outcome | null {
  if (name === "search_approved_docs") {
    return { text: searchApprovedDocs(args.query || "", args.country || ""), isError: false };
  }
  if (name === "get_hcp_profile") {
    const doctor = CRM[args.hcpId];
    if (!doctor) return { text: `Unknown HCP ${args.hcpId}`, isError: true };
    return { text: `${doctor.name}, ${doctor.specialty}, ${doctor.country}`, isError: false };
  }
  if (name === "check_recent_outreach") {
    const mails = EMAILS[args.hcpId] || [];
    return { text: mails.length === 0 ? "No recent outreach." : `Recent outreach: ${mails.join("; ")}`, isError: false };
  }
  return null;
}

function answer(id: number, result: object) {
  return { jsonrpc: "2.0", id, result };
}

function handle(message: { id?: number; method: string; params?: any }) {
  const id = message.id;
  if (id === undefined) return null; // a notification gets no answer
  if (message.method === "initialize") {
    const info = { name: "hcp-lab-server", version: "1" };
    return answer(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: info });
  }
  if (message.method === "tools/list") return answer(id, { tools: TOOLS });
  if (message.method === "tools/call") {
    const outcome = callTool(message.params.name, message.params.arguments || {});
    if (outcome === null) {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${message.params.name}` } };
    }
    return answer(id, { content: [{ type: "text", text: outcome.text }], isError: outcome.isError });
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${message.method}` } };
}

// Answer each line as soon as it arrives, so a client can keep the server open.
// A real MCP client waits for the answer before it closes the input.
let waiting = "";
for await (const chunk of Bun.stdin.stream()) {
  waiting += new TextDecoder().decode(chunk);
  const lines = waiting.split("\n");
  waiting = lines.pop() || "";
  for (const line of lines) {
    if (line.trim() === "") continue;
    const reply = handle(JSON.parse(line));
    if (reply) console.log(JSON.stringify(reply));
  }
}
