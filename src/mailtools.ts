// The tools and types lab 26 runs hooks around. The lesson is in labs/26-hooks.ts.

import { searchApprovedDocs } from "../labs/01-agent-loop";

export type Call = { tool: string; to: string; text: string };
export type Before = { name: string; check(call: Call): string };
export type After = { name: string; fix(call: Call, output: string): string };
export type Hooks = { before: Before[]; after: After[] };
export type Mail = { to: string; text: string };
export type Ran = { sent: Mail[]; outputs: string[]; blocked: string[]; log: string[] };

export const NOTE =
  "Call note: Patient Jane Doe (SSN 123-45-6789) takes Cardioza and asked about the dose.";
export const TOOLS = ["read_note", "search_approved_docs", "send_email"];

// Run one tool for real. The email tool adds to the list of sent mail.
export function runTool(call: Call, sent: Mail[]): string {
  if (call.tool === "read_note") return NOTE;
  if (call.tool === "search_approved_docs") return searchApprovedDocs("Cardioza", "US");
  sent.push({ to: call.to, text: call.text });
  return `Email sent to ${call.to}.`;
}

// The address in the question is the word with an at sign.
export function addressIn(question: string): string {
  for (const word of question.split(" ")) {
    if (!word.includes("@")) continue;
    if (word.endsWith(".") || word.endsWith("?")) return word.slice(0, -1);
    return word;
  }
  return "";
}
