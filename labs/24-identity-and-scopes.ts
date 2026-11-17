// Identity and scopes
//
// Our system has three bots. One answers dose questions. One writes to doctors. One reads reports.
// A doctor asks the answer bot: "What is the dose of Cardioza, and can you email it to Dr. Lee?"
// The answer bot should not send email. If all bots share one key, it can.
// So each bot gets its own signed token, and the token lists the only things it may do.
// Every tool call shows its token first. Code checks the token, then the scope, then runs the tool.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/24-identity-and-scopes.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab identity-and-scopes --question "What is the dose of Cardioza, and can you email it to Dr. Lee?" --bot answer --naive
//   bun run lab identity-and-scopes --question "What is the dose of Cardioza?" --bot answer
//   bun run lab identity-and-scopes --question "What is the dose of Cardioza, and can you email it to Dr. Lee?" --bot answer
//   bun run lab identity-and-scopes --question "What is the dose of Cardioza, and can you email it to Dr. Lee?" --bot outreach
//   bun run lab identity-and-scopes --question "What is the dose of Cardioza?" --bot answer --forge true
//   bun run lab identity-and-scopes --question "What is the dose of Cardioza?" --bot answer --expired true
//   bun run lab identity-and-scopes --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { botSecret, issue, verify } from "../src/identity"; // the signed token
import type { Claims } from "../src/identity";
import { searchApprovedDocs } from "./01-agent-loop";
import { CRM } from "../src/data";

export type Decision = { tool: string; allowed: boolean; reason: string; result: string };

// What each tool needs, and what each bot is allowed. Least privilege: nothing extra.
export const NEEDS: Record<string, string> = {
  search_approved_docs: "docs.read",
  read_crm: "crm.read",
  send_email: "email.send",
};
export const BOT_SCOPES: Record<string, string[]> = {
  answer: ["docs.read"],
  outreach: ["docs.read", "crm.read", "email.send"],
  report: ["crm.read"],
};

// Make the token a bot carries. It lasts a few minutes, so a stolen one soon stops working.
export function tokenFor(bot: string, now: number): string {
  const claims: Claims = { bot, scopes: BOT_SCOPES[bot], expires: now + 300 };
  return issue(claims, botSecret());
}

// One tool call, the careful way. Read the steps in order.
export function callTool(token: string, tool: string, sent: string[], now: number): Decision {
  // Step 1: check the token. A changed or old token is a stranger.
  const who = verify(token, botSecret(), now);
  if (!who.ok) return denied(tool, `Step 1: ${who.reason}.`);

  // Step 2: find what the tool needs. A tool we do not know is refused.
  const needed = NEEDS[tool];
  if (needed === undefined) return denied(tool, "Step 2: no such tool.");

  // Step 3: the token must list that scope. Least privilege means nothing extra.
  if (!who.claims.scopes.includes(needed)) {
    const reason = `Step 3: the ${who.claims.bot} bot has no ${needed}, so ${tool} did not run.`;
    return denied(tool, reason);
  }

  // Step 4: run the tool. The log says which bot did it.
  const result = runTool(tool, sent);
  return { tool, allowed: true, reason: `Step 4: the ${who.claims.bot} bot ran ${tool}.`, result };
}

function denied(tool: string, reason: string): Decision {
  return { tool, allowed: false, reason, result: "" };
}

// The three tools. Real search, a real list from the CRM, and an outbox for email.
function runTool(tool: string, sent: string[]): string {
  if (tool === "search_approved_docs") return searchApprovedDocs("Cardioza", "US");
  if (tool === "read_crm") return `${Object.keys(CRM).length} doctors in the CRM.`;
  sent.push("Dr. Lee");
  return "Email sent to Dr. Lee.";
}

// Ask the model which tools the request needs, then try each one with the bot's token.
export function runBot(
  question: string,
  token: string,
  callLlm: CallLlm,
  sent: string[],
  now: number,
) {
  const names = Object.keys(NEEDS);
  const ask = "ACT: List the tools this request needs, one per line.";
  const prompt = `${ask}\nTools: ${names.join(", ")}\nQuestion: ${question}`;
  const reply = callLlm([{ role: "user", content: prompt }], []).text || "";
  const decisions: Decision[] = [];
  for (const tool of names) {
    if (reply.includes(tool)) decisions.push(callTool(token, tool, sent, now));
  }
  return decisions;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/24-identity-and-scopes");
  runLab(lab);
}
