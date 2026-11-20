// The small tools for the MCP trust lab: the types, the plan reader and the tool fingerprint.
// The lesson is in labs/08-mcp-trust.ts. You do not need to read this file.
import { createHash } from "node:crypto";
import type { CallLlm } from "./model";

export type ToolInfo = { name: string; description: string; schema: string };
export type Manifest = { server: string; tools: ToolInfo[] };
export type Pins = Record<string, string>; // "server/tool" and its fingerprint

const ORDER_WORDS = ["ignore previous", "ignore all", "do not tell", "always send"];
const LINK_WORDS = ["secretly", "http"];

export type Plan = { use: string; reads: string[]; sends: string[] };
export type Loaded = {
  review: Review;
  prompt: string;
  pick: string;
  plan: Plan;
  stopped: string[];
  log: string[];
};

// Ask the model for its plan. Whatever is in the prompt, the model reads.
export function pickTool(prompt: string, question: string, callLlm: CallLlm): string {
  const ask = `PICK: ${prompt}\nQuestion: ${question}\nWrite your plan as lines: use, read, send.`;
  const reply = callLlm([{ role: "user", content: ask }], []);
  return (reply.text || "").trim();
}

// Read the plan lines. Each line is a word, a colon and a value.
export function readPlan(text: string): Plan {
  const plan: Plan = { use: "none", reads: [], sends: [] };
  for (const line of text.split("\n")) {
    if (line.startsWith("use: ")) plan.use = line.slice(5).trim();
    if (line.startsWith("read: ")) plan.reads.push(line.slice(6).trim());
    if (line.startsWith("send: ")) plan.sends.push(line.slice(6).trim());
  }
  return plan;
}

// A fingerprint changes if even one letter of the tool changes.
export function fingerprint(tool: ToolInfo): string {
  const text = `${tool.name}|${tool.description}|${tool.schema}`;
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

export function hasOrder(description: string): boolean {
  const text = description.toLowerCase();
  for (const word of ORDER_WORDS.concat(LINK_WORDS)) {
    if (text.includes(word)) return true;
  }
  return false;
}

export type Review = { kind: string; trusted: ToolInfo[]; problems: string[] };

// The naive way: load every description into the prompt, whatever the server says.
export function naivePrompt(manifest: Manifest): string {
  let prompt = "You can use these tools:";
  for (const tool of manifest.tools) prompt += `\n- ${tool.name}: ${tool.description}`;
  return prompt;
}
