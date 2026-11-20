// MCP basics
//
// The inbox manager helps Maya find things. Three servers hold her tools: Gmail, Slack and Drive.
// Each one has a tool called search and a tool called get_user. The agent asks each server what
// tools it has. If it hands all six to the model on every call, the cost grows and the names clash.
// So a cheap check comes first, then a search over the tool descriptions hands the model two tools.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/07-mcp-basics.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab mcp-basics --question "Who is Dana on Slack?" --naive
//   bun run lab mcp-basics --question "Who is Dana on Slack?"
//   bun run lab mcp-basics --question "Find the signed contract email"
//   bun run lab mcp-basics --question "Who is Dana on Slack?" --show wire
//   bun run lab mcp-basics --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import type { Asked, McpTool } from "../src/mcp-client";
import { findReply, findTool, isChat, outcomeOf, pickTool, rankTools, rpc } from "../src/mcp-client";
import { HELLO, SERVER, talk, toolText } from "../src/mcp-client";
import { countTokens } from "./10-context-budget";

export const SERVICES = ["gmail", "slack", "drive"];
export const TOP = 2; // the model sees this many tools, never all of them

// Every server is the same program. The second word picks the service.
export function serverFor(service: string, down = ""): string {
  if (down !== "") return down;
  return `${SERVER} ${service}`;
}

// Answer a question with the cheap check first, then two tools. Read the steps in order.
export function askInbox(question: string, callLlm: CallLlm, down = ""): Asked {
  // Step 1: ask every server what tools it has. Nothing is written into the agent.
  const all = listAllTools(down);
  const log = [`Step 1: the three servers have ${all.length} tools.`];
  if (all.length === 0) return { answer: "", outcome: "no-server", shown: [], tokens: 0, log };

  // Step 2: a cheap check. Small talk needs no tool, so no tool text is sent at all.
  if (isChat(question)) {
    log.push("Step 2: this is small talk. No tool is needed.");
    const greeting = "Hi Maya. Ask me about mail, Slack or Drive.";
    return { answer: greeting, outcome: "no-tools", shown: [], tokens: 0, log };
  }
  log.push("Step 2: the question needs a tool.");

  // Step 3: search the tool descriptions. Keep the best two. The rest never reach the model.
  const top = rankTools(question, all, TOP);
  const shown: string[] = [];
  for (const tool of top) shown.push(tool.full);
  log.push(`Step 3: the best tools are ${shown.join(" and ")}.`);

  // Step 4: the model picks one of those two. It cannot pick a tool it was not shown.
  const picked = pickTool(question, top, callLlm);
  log.push(`Step 4: the model said: ${picked.name} | ${picked.word}`);
  const chosen = findTool(top, picked.name);
  const tokens = countTokens(toolText(top, true));
  if (chosen === undefined) {
    return { answer: `${picked.name} was not shown`, outcome: "not-shown", shown, tokens, log };
  }

  // Step 5: call that tool on its own server. A prefix tells us which server that is.
  const result = callMcpTool(chosen.name, { text: picked.word }, serverFor(chosen.service, down));
  log.push(`Step 5: ${chosen.full} returned: ${result}`);
  return { answer: result, outcome: outcomeOf(result), shown, tokens, log };
}

// The NAIVE way: all six tools on every call, with the plain names. Two tools share each name.
export function askNaive(question: string, callLlm: CallLlm): Asked {
  const all = listAllTools();
  const picked = pickTool(question, all, callLlm, false);
  // With a plain name, the first server that has it gets the call.
  let service = "";
  for (const tool of all) {
    if (tool.name === picked.name) {
      service = tool.service;
      break;
    }
  }
  const result = callMcpTool(picked.name, { text: picked.word }, serverFor(service));
  const right = rankTools(question, all, 1)[0].service;
  let outcome = "wrong-server";
  if (service === right) outcome = outcomeOf(result);
  const log = [`The model said: ${picked.name}. The call went to ${service}, not ${right}.`];
  return { answer: result, outcome, shown: [], tokens: countTokens(toolText(all, false)), log };
}

// Ask one server what tools it has. A server that is not there has none.
export function discoverTools(script = SERVER): { name: string; description: string }[] {
  const reply = findReply(talk(HELLO.concat([rpc(2, "tools/list")]), script), 2);
  if (reply === null || !reply.result) return [];
  return reply.result.tools;
}

// Ask all three servers. The full name is the service, then the tool: slack_get_user.
export function listAllTools(down = ""): McpTool[] {
  const all: McpTool[] = [];
  for (const service of SERVICES) {
    for (const tool of discoverTools(serverFor(service, down))) {
      const full = `${service}_${tool.name}`;
      all.push({ service, name: tool.name, full, description: tool.description });
    }
  }
  return all;
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

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/07-mcp-basics");
  runLab(lab);
}
