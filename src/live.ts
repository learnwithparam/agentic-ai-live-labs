// A real model, for any lab: add --live to the command. It uses OpenRouter and your own key.
// The key comes from the environment variable OPENROUTER_API_KEY. It is never printed.
// A lab calls the model through callLlm, so the same lab code runs on the pretend model or this one.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CallLlm, Message, Reply } from "./model";

export const LIVE_MODEL = "nvidia/nemotron-3.5-lightning";
const ENDPOINT = process.env.OPENROUTER_URL || "https://openrouter.ai/api/v1/chat/completions";

const TOOL_TEXT: Record<string, string> = {
  search_approved_docs: "Find the approved documents for a drug in one country.",
  get_hcp_profile: "Get the doctor's profile: country and consent.",
  check_recent_outreach: "Check which emails this doctor got recently.",
};

function toolDefinition(name: string) {
  const text = { type: "string" };
  const properties = { query: text, country: text, hcpId: text };
  const parameters = { type: "object", properties, required: ["query", "country"] };
  return { type: "function", function: { name, description: TOOL_TEXT[name] || name, parameters } };
}

// The pretend model reads a list of messages. A real model reads text, so tool results go in as text.
export function toChatMessages(messages: Message[]) {
  const chat: { role: string; content: string }[] = [];
  let results = "";
  for (const message of messages) {
    if (message.role === "tool") results += `\nTool ${message.name} returned:\n${message.content}\n`;
    else chat.push({ role: message.role, content: message.content });
  }
  if (results) chat.push({ role: "user", content: `Tool results so far:${results}` });
  return chat;
}

export function buildBody(messages: Message[], toolNames: string[], model: string) {
  const body: Record<string, unknown> = { model, messages: toChatMessages(messages), temperature: 0 };
  if (toolNames.length > 0) body.tools = toolNames.map(toolDefinition);
  return body;
}

// A real model changes small marks from run to run: bold stars, odd hyphens, odd brackets.
// Put them back to plain marks here once, so no lab has to guard against them.
export function cleanText(text: string): string {
  const marks: [string, string][] = [["*", ""], ["\u2011", "-"], ["\u2010", "-"], ["\u00a0", " "]];
  const brackets: [string, string][] = [["\u3010", "["], ["\u3011", "]"], ["\u202f", " "]];
  let clean = text;
  for (const [from, to] of marks.concat(brackets)) clean = clean.replaceAll(from, to);
  return clean;
}

export function replyFrom(response: any): Reply {
  if (response.error) throw new Error(`The model call failed: ${JSON.stringify(response.error)}`);
  const message = response.choices[0].message;
  const call = message.tool_calls?.[0];
  if (call) {
    const args = JSON.parse(call.function.arguments || "{}");
    return { toolCall: { name: call.function.name, args: { query: "", country: "", hcpId: "none", ...args } } };
  }
  return { text: cleanText(String(message.content || "")).trim() };
}

// The key goes to curl through its config on stdin, never on the command line.
function post(body: Record<string, unknown>): any {
  const key = (process.env.OPENROUTER_API_KEY || "").trim().replaceAll('"', "").replaceAll("'", "");
  if (!key) throw new Error("Set OPENROUTER_API_KEY to use --live.");
  if (process.env.LIVE_TRACE) console.error("live-call");
  const file = join(mkdtempSync(join(tmpdir(), "live-")), "body.json");
  writeFileSync(file, JSON.stringify(body));
  const config = `url = "${ENDPOINT}"\nheader = "Authorization: Bearer ${key}"\nheader = "Content-Type: application/json"\n`;
  const run = Bun.spawnSync(["curl", "-sS", "--max-time", "90", "--config", "-", "--data-binary", `@${file}`], {
    stdin: new TextEncoder().encode(config),
  });
  if (run.exitCode !== 0) throw new Error(`curl failed: ${run.stderr.toString()}`);
  return JSON.parse(run.stdout.toString());
}

export function makeLiveModel(model = LIVE_MODEL): CallLlm {
  return (messages, toolNames) => replyFrom(post(buildBody(messages, toolNames, model)));
}
