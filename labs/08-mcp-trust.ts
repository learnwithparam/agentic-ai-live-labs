// Lab 8: Trusting an MCP server
//
// Dr. Lee asks: "What is the Cardioza dose?" The agent finds its tools on an MCP server.
// A tool description is text that goes into the model's prompt. So whoever writes it can give the
// model orders. We check each server, and we pin each tool, so a later change does not slip in.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/08-mcp-trust.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server unknown-server --naive
//   bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server approved
//   bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server unknown-server
//   bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server rug-pull
//   bun labs/08-mcp-trust.ts --demo

import { createHash } from "node:crypto";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";

export type ToolInfo = { name: string; description: string; schema: string };
export type Manifest = { server: string; tools: ToolInfo[] };
export type Pins = Record<string, string>; // "server/tool" and its fingerprint

export const APPROVED_SERVERS = ["hcp-docs"];
const ORDER_WORDS = ["ignore previous", "ignore all", "do not tell", "always send"];
const LINK_WORDS = ["secretly", "http"];

export const QUESTION = "What is the Cardioza dose?";
export type Loaded = { review: Review; prompt: string; pick: string; log: string[] };

// Decide which tools the model may see, then let it choose one. Read the steps in order.
export function loadServer(manifest: Manifest, pins: Pins, callLlm: CallLlm): Loaded {
  // Step 1: vet the server. Only tools that pass every test are trusted.
  const review = vetServer(manifest, pins);
  const count = review.trusted.length;
  const log = [`Step 1: the review says ${review.kind}. ${count} tools are trusted.`];
  for (const problem of review.problems) log.push(`        ${problem}`);

  // Step 2: write the prompt from the trusted tools only. A held tool never reaches the model.
  const prompt = naivePrompt({ server: manifest.server, tools: review.trusted });
  log.push("Step 2: wrote the prompt from the trusted tools only.");

  // Step 3: the model chooses a tool from that prompt.
  const pick = pickTool(prompt, callLlm);
  log.push(`Step 3: the model said: ${pick}`);
  return { review, prompt, pick, log };
}

// Ask the model which tool it would use. Whatever is in the prompt, the model reads.
export function pickTool(prompt: string, callLlm: CallLlm): string {
  const ask = `PICK: ${prompt}\nQuestion: ${QUESTION}\nWhich tool will you use?`;
  const reply = callLlm([{ role: "user", content: ask }], []);
  return (reply.text || "").trim();
}

// A fingerprint changes if even one letter of the tool changes.
export function fingerprint(tool: ToolInfo): string {
  const text = `${tool.name}|${tool.description}|${tool.schema}`;
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

// Approve: a person reviewed these tools, so we remember what they looked like.
export function pinAll(manifest: Manifest): Pins {
  const pins: Pins = {};
  for (const tool of manifest.tools) pins[`${manifest.server}/${tool.name}`] = fingerprint(tool);
  return pins;
}

function hasOrder(description: string): boolean {
  const text = description.toLowerCase();
  for (const word of ORDER_WORDS.concat(LINK_WORDS)) {
    if (text.includes(word)) return true;
  }
  return false;
}

export type Review = { kind: string; trusted: ToolInfo[]; problems: string[] };

// Note a problem. The first problem found sets the kind of the whole review.
function hold(review: Review, kind: string, problem: string) {
  if (review.kind === "trusted") review.kind = kind;
  review.problems.push(problem);
}

// Vet: only a tool that passes every test is trusted. The rest are held back, with a reason.
export function vetServer(manifest: Manifest, pins: Pins): Review {
  const review: Review = { kind: "trusted", trusted: [], problems: [] };
  if (!APPROVED_SERVERS.includes(manifest.server)) {
    hold(review, "blocked", `${manifest.server} is not an approved server`);
    return review;
  }
  for (const tool of manifest.tools) {
    const pinned = pins[`${manifest.server}/${tool.name}`];
    if (pinned === undefined) hold(review, "new", `${tool.name} is new. A person must review it.`);
    else if (pinned !== fingerprint(tool)) hold(review, "changed", `${tool.name} was changed.`);
    else if (hasOrder(tool.description)) hold(review, "trap", `${tool.name} has an order in it.`);
    else review.trusted.push(tool);
  }
  return review;
}

// The naive way: load every description into the prompt, whatever the server says.
export function naivePrompt(manifest: Manifest): string {
  let prompt = "You can use these tools:";
  for (const tool of manifest.tools) prompt += `\n- ${tool.name}: ${tool.description}`;
  return prompt;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/08-mcp-trust");
  runLab(lab);
}
