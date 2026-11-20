// Function, CLI or MCP
//
// Juniper Studio has a chat for clients. A client may ask the price of a logo.
// A client may ask for a call on Thursday, or for a payment link. There are three doors to a tool: a plain function,
// a shell command, and an MCP server. Juniper's own price list is a function. The booking app
// belongs to someone else, so it is reached over MCP. A command is for the repo, as gh is.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/09-three-doors.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab three-doors --question "What does a logo cost?" --naive
//   bun run lab three-doors --question "What does a brand kit cost?" --door function
//   bun run lab three-doors --question "Book me in on Thursday at 3pm" --door mcp
//   bun run lab three-doors --question "Did build 3 pass or fail?" --door cli
//   bun run lab three-doors --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { PRICES } from "../src/team";
import { runShell } from "./06-shell-tool";
import { callMcpTool, serverFor } from "./07-mcp-basics"; // the MCP client from the MCP basics lab

export const NO_PRICE = "No price for that.";

export type Door = { name: string; ask(item: string, server: string): string };

export type Told = { trip: Trip; reply: string; log: string[] };

// Answer a question through one door. Read the steps in order.
export function answerThrough(door: Door, question: string, callLlm: CallLlm, server = ""): Told {
  // Step 1: the model finds the one thing this door needs in the question.
  const item = findItem(door.name, question, callLlm);
  const log = [`Step 1: the model found: ${item}`];

  // Step 2: send it through the door and time it.
  const trip = through(door, item, server);
  log.push(`Step 2: the ${door.name} door answered in ${trip.milliseconds} ms: ${trip.answer}`);

  // Step 3: the model writes the reply for the client, using only what the door returned.
  const rule = "Use only the source. Keep any source tag. If it is empty, say so.";
  const prompt = `TELL: ${rule}\nSOURCE: ${trip.answer}\nQuestion: ${question}`;
  const reply = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
  log.push(`Step 3: the model wrote: ${reply}`);
  return { trip, reply, log };
}

// Ask the model for the one thing the door needs. The item is all we send through the door.
export function findItem(doorName: string, question: string, callLlm: CallLlm): string {
  const prompt = `ITEM: Reply with the item only. door=${doorName}\nQuestion: ${question}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  return (reply.text || question).trim();
}

// Door 1: call a function in our own code. Nothing to start, nothing to break.
export function quote(service: string): string {
  const price = PRICES[service];
  if (price === undefined) return NO_PRICE;
  return `${service}: ${price} USD [price-list]`;
}

// Door 2: run a command. It reads a log in the repo. A log has no source tag.
function cliDoor(build: string): string {
  const shell = runShell(`cat ${build}.log`);
  if (shell.status === "refused") return `ERROR: ${shell.why}`;
  if (shell.status !== "ran") return `No log called ${build}.`;
  return shell.output;
}

// Door 3: ask an MCP server. The booking app is not ours, so this is the right door.
// The item is a tool name, a bar and a word, like: book_slot | thursday-3pm
function mcpDoor(item: string, server: string): string {
  const parts = item.split(" | ");
  return callMcpTool(parts[0], { text: parts[1] || "" }, server || serverFor("booking"));
}

export const DOORS: Door[] = [
  { name: "function", ask: quote },
  { name: "cli", ask: cliDoor },
  { name: "mcp", ask: mcpDoor },
];

// The NAIVE way: the price list behind a shell command. It works, but the answer has no source tag.
export const PRICES_BY_SHELL: Door = {
  name: "price-file",
  ask(service) {
    const shell = runShell(`grep ${service} prices.txt`);
    if (shell.status === "ran") return shell.output;
    return NO_PRICE;
  },
};

export type Trip = { door: string; answer: string; milliseconds: number; outcome: string };

// What the answer is worth. Only an answer with a source tag can be checked by the guardrails lab.
export function outcomeOf(answer: string): string {
  if (answer.startsWith("ERROR")) return "door-error";
  if (answer === NO_PRICE || answer.startsWith("No ")) return "no-source";
  if (answer.includes("[") && answer.includes("]")) return "answered";
  return "uncited";
}

// Send one item through one door and time it.
export function through(door: Door, item: string, server = ""): Trip {
  const start = performance.now();
  const answer = door.ask(item, server);
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
