// Function, CLI or MCP
//
// Dr. Lee asks: "What is the Cardioza dose?" One job, three doors to the tool: a plain function,
// a shell command, and an MCP server. The answer should be the same. The cost, the risk and the
// shape of the answer are not.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/09-three-doors.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab three-doors --question "What is the dose of Cardioza?" --naive --door cli
//   bun run lab three-doors --question "What is the Cardioza dose?" --door function
//   bun run lab three-doors --question "What is the dose of Cardioza?" --door mcp
//   bun run lab three-doors --question "What is the dose of Cardioza?" --door all
//   bun run lab three-doors --demo

import { NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { searchApprovedDocs } from "./01-agent-loop";
import { runShell } from "./06-shell-tool";
import { callMcpTool, SERVER } from "./07-mcp-basics"; // the MCP client from the MCP basics lab

export type Door = { name: string; ask(drug: string, country: string, server: string): string };

// Door 1: call a function in our own code. Nothing to start, nothing to break.

export type Told = { trip: Trip; reply: string; log: string[] };

// Answer a question through one door. Read the steps in order.
export function answerThrough(
  door: Door,
  question: string,
  country: string,
  callLlm: CallLlm,
  server = SERVER,
): Told {
  // Step 1: the model finds the drug name in the question.
  const drug = findDrug(question, callLlm);
  const log = [`Step 1: the model found the drug: ${drug}`];

  // Step 2: send the drug through the door and time it.
  const trip = through(door, drug, country, server);
  log.push(`Step 2: the ${door.name} door answered in ${trip.milliseconds} ms: ${trip.answer}`);

  // Step 3: the model writes the reply for the doctor, using only what the door returned.
  const rule = "Use only the source. Keep any document id. If it is empty, say so.";
  const prompt = `WRITE: ${rule}\nSOURCE: ${trip.answer}\nQuestion: ${question}`;
  const reply = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
  log.push(`Step 3: the model wrote: ${reply}`);
  return { trip, reply, log };
}

// Ask the model for the drug name. The name is all we send through the door.
export function findDrug(question: string, callLlm: CallLlm): string {
  const prompt = `DRUG: Reply with the drug name only.\nQuestion: ${question}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  return (reply.text || question).trim();
}

function functionDoor(drug: string, country: string): string {
  return searchApprovedDocs(drug, country);
}

// Door 2: run a command. It reads a file and has no idea what a document id is.
function cliDoor(drug: string, country: string): string {
  const shell = runShell(`cat ${drug.toLowerCase()}.txt`);
  if (shell.status === "refused") return `ERROR: ${shell.why}`;
  if (shell.status !== "ran") return NO_DOC;
  for (const line of shell.output.split("\n")) {
    if (line.startsWith(`${country} `)) return `${drug} ${line}`;
  }
  return NO_DOC;
}

// Door 3: ask an MCP server. Other programs can use the same server.
function mcpDoor(drug: string, country: string, server: string): string {
  return callMcpTool("search_approved_docs", { query: drug, country }, server);
}

export const DOORS: Door[] = [
  { name: "function", ask: functionDoor },
  { name: "cli", ask: cliDoor },
  { name: "mcp", ask: mcpDoor },
];

export type Trip = { door: string; answer: string; milliseconds: number; outcome: string };

// What the answer is worth. Only an answer with a document id can be checked by the guardrails lab's guardrail.
export function outcomeOf(answer: string): string {
  if (answer.startsWith("ERROR")) return "door-error";
  if (answer === NO_DOC) return "no-source";
  if (answer.includes("DOC-")) return "answered";
  return "uncited";
}

// Send one question through one door and time it.
export function through(door: Door, drug: string, country: string, server = SERVER): Trip {
  const start = performance.now();
  const answer = door.ask(drug, country, server);
  const milliseconds = Math.round(performance.now() - start);
  return { door: door.name, answer, milliseconds, outcome: outcomeOf(answer) };
}

export function findDoor(name: string): Door | undefined {
  for (const door of DOORS) {
    if (door.name === name) return door;
  }
  return undefined;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/09-three-doors");
  runLab(lab);
}
