// The small tools for the MCP basics lab: the wire messages, the ranking and the tool text.
// The lesson is in labs/07-mcp-basics.ts. You do not need to read this file.
import type { CallLlm } from "./model";
import { SMALL_WORDS, wordsOf } from "./studio-bots";

export const SERVER = "src/mcp-server.ts";
const CHAT_WORDS = ["hello", "hi", "hey", "thanks", "thank", "bye"];

export type McpTool = { service: string; name: string; full: string; description: string };
export type Asked = {
  answer: string;
  outcome: string;
  shown: string[];
  tokens: number;
  log: string[];
};

export function outcomeOf(result: string): string {
  if (result.startsWith("ERROR")) return "tool-error";
  if (result.startsWith("No match")) return "no-match";
  return "answered";
}

// Small talk starts with a greeting word.
export function isChat(question: string): boolean {
  const words = wordsOf(question);
  return words.length > 0 && CHAT_WORDS.includes(words[0]);
}

// Score each tool by how many words of the question are in its description. Best first.
export function rankTools(question: string, tools: McpTool[], count: number): McpTool[] {
  const wanted: string[] = [];
  for (const word of wordsOf(question)) {
    if (!SMALL_WORDS.includes(word)) wanted.push(word);
  }
  const scores: number[] = [];
  for (const tool of tools) scores.push(score(wanted, tool));
  const best: McpTool[] = [];
  for (let place = 0; place < count && place < tools.length; place++) {
    let top = -1;
    for (let index = 0; index < tools.length; index++) {
      if (best.includes(tools[index])) continue;
      if (top === -1 || scores[index] > scores[top]) top = index;
    }
    best.push(tools[top]);
  }
  return best;
}

function score(wanted: string[], tool: McpTool): number {
  const words = wordsOf(`${tool.service} ${tool.description}`);
  let points = 0;
  for (const word of wanted) {
    if (words.includes(word)) points++;
  }
  return points;
}

// The text the model reads for a list of tools. A prefixed name says which server owns the tool.
export function toolText(tools: McpTool[], prefixed: boolean): string {
  let text = "";
  for (const tool of tools) text += `- ${prefixed ? tool.full : tool.name}: ${tool.description}\n`;
  return text;
}

// Ask the model for one tool and one word to look up. It writes: name | word.
export function pickTool(question: string, tools: McpTool[], callLlm: CallLlm, prefixed = true) {
  const list = toolText(tools, prefixed);
  const prompt = `MCPPICK: Pick one tool. Reply as: name | word\nTools:\n${list}Question: ${question}`;
  const reply = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
  const parts = reply.split(" | ");
  return { name: parts[0], word: parts[1] || "" };
}

export function findTool(tools: McpTool[], full: string): McpTool | undefined {
  for (const tool of tools) {
    if (tool.full === full) return tool;
  }
  return undefined;
}

// Every MCP message is JSON with an id, a method and some params.
export function rpc(id: number | undefined, method: string, params: object = {}) {
  return { jsonrpc: "2.0", id, method, params };
}

// The greeting every session starts with: introduce ourselves, then say we are ready.
const client = { name: "inbox-lab", version: "1" };
const hello = { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: client };
export const HELLO = [rpc(1, "initialize", hello), rpc(undefined, "notifications/initialized")];

// Send our messages to the server, one per line. Return the lines it wrote back.
// A real client keeps the server open. Here we send everything, then close, to keep it short.
export function talk(requests: object[], script = SERVER): string[] {
  let input = "";
  for (const request of requests) input += JSON.stringify(request) + "\n";
  const command = ["bun"];
  for (const part of script.split(" ")) command.push(part);
  const run = Bun.spawnSync(command, { stdin: Buffer.from(input) });
  const lines: string[] = [];
  for (const line of run.stdout.toString().split("\n")) {
    if (line.trim() !== "") lines.push(line);
  }
  return lines;
}

// Find the server's answer to the request with this id.
export function findReply(lines: string[], id: number) {
  for (const line of lines) {
    const reply = JSON.parse(line);
    if (reply.id === id) return reply;
  }
  return null;
}
