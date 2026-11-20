// The tools and the secret finder for the hooks lab. The lesson is in labs/26-hooks.ts.
// You do not need to read this file.
import { CI_LOGS } from "./team";

export type ToolCall = { tool: string; input: string };

export const TOOLS = ["read_file", "run_shell"];
export const SECRET_MARKS = ["sk_live_", "ghp_", "AKIA"];

// The files the agent can read. Each one holds a secret, as real projects do.
const FILES: Record<string, string> = {
  ".env": "STRIPE_KEY=sk_live_51Hx9aQ2zLm\nMODE=test",
  "build-3.log": `${CI_LOGS["build-3"]}\ncurl failed. Header: Authorization: Bearer ghp_a1b2c3d4e5f6`,
};

// Run one tool for real. A push is only written down. Nothing leaves this computer.
export function runTool(call: ToolCall, pushes: string[]): string {
  if (call.tool === "read_file") return FILES[call.input] || `No file called ${call.input}.`;
  if (call.input.startsWith("cat ")) return FILES[call.input.slice(4)] || "No such file.";
  if (call.input.includes("git push")) {
    pushes.push(call.input);
    return `pushed: ${call.input}`;
  }
  if (call.input.startsWith("bun test")) return CI_LOGS["build-2"].split("\n")[0];
  return `ran: ${call.input}`;
}

// Swap every secret in a word for a token. The word starts at the mark and ends at the space.
function hideInWord(word: string): string {
  for (const mark of SECRET_MARKS) {
    const start = word.indexOf(mark);
    if (start >= 0) return `${word.slice(0, start)}[SECRET]`;
  }
  return word;
}

export function hideSecrets(text: string): string {
  const lines: string[] = [];
  for (const line of text.split("\n")) {
    const words: string[] = [];
    for (const word of line.split(" ")) words.push(hideInWord(word));
    lines.push(words.join(" "));
  }
  return lines.join("\n");
}
