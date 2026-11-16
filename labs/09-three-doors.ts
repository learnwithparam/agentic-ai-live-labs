// LAB 9: FUNCTION, CLI OR MCP
//
// Read PART 1. One job, three doors: a plain function, a shell command, and an MCP server.
// The answer should be the same. The cost, the risk and the shape of the answer are not.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it (copy any line):
//   bun run lab 9 --question "Cardioza" --naive --door cli
//   bun run lab 9 --question "Cardioza" --door function
//   bun run lab 9 --question "Cardioza" --door mcp
//   bun run lab 9 --question "Cardioza" --door all
//   bun run lab 9 --demo

import { NO_DOC } from "../src/data";
import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, bold, box, cyan, dim, field, green } from "../src/ui";
import { print, red, rule, wrap, yellow } from "../src/ui";
import { searchApprovedDocs } from "./01-agent-loop"; // the search from lab 1
import { runShell } from "./06-shell-tool"; // the safe shell from lab 6
import { callMcpTool, SERVER } from "./07-mcp-basics"; // the MCP client from lab 7

// PART 1: THE CORE LOGIC

export type Door = { name: string; ask(drug: string, country: string, server: string): string };

// DOOR 1: call a function in our own code. Nothing to start, nothing to break.
function functionDoor(drug: string, country: string): string {
  return searchApprovedDocs(drug, country);
}

// DOOR 2: run a command. It reads a file and has no idea what a document id is.
function cliDoor(drug: string, country: string): string {
  const shell = runShell(`cat ${drug.toLowerCase()}.txt`);
  if (shell.status === "refused") return `ERROR: ${shell.why}`;
  if (shell.status !== "ran") return NO_DOC;
  for (const line of shell.output.split("\n")) {
    if (line.startsWith(`${country} `)) return `${drug} ${line}`;
  }
  return NO_DOC;
}

// DOOR 3: ask an MCP server. Other programs can use the same server.
function mcpDoor(drug: string, country: string, server: string): string {
  return callMcpTool("search_approved_docs", { query: drug, country }, server);
}

export const DOORS: Door[] = [
  { name: "function", ask: functionDoor },
  { name: "cli", ask: cliDoor },
  { name: "mcp", ask: mcpDoor },
];

export type Trip = { door: string; answer: string; milliseconds: number; outcome: string };

// What the answer is worth. Only an answer with a document id can be checked by lab 2's guardrail.
export function outcomeOf(answer: string): string {
  if (answer.startsWith("ERROR")) return "door-error";
  if (answer === NO_DOC) return "no-source";
  if (answer.includes("[DOC-")) return "answered";
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

// PART 2: HOW IT IS SHOWN (you can skip this)

const WHEN: Record<string, string> = {
  function: "Your own code, one team. Fastest and simplest. Nobody else can reuse it.",
  cli: "A tool that already exists as a command. Needs the four rules of lab 6, and the output has no structure.",
  mcp: "Many agents or many teams share the tool. Slower to start, and needs the trust checks of lab 8.",
};

export const lab: Lab = {
  file: "09-three-doors.ts",
  title: "Lab 9: function, CLI or MCP",
  about:
    "The question box takes a drug name. The same lookup runs through three doors. Pick one with --door function, cli or mcp, or use --door all to compare them.",
  terms: "door = the way an agent reaches a tool. latency = how long a call takes. structured = has fields a program can read.",
  challenge: "Teams pick a door by habit. Each door has a cost, a risk and a shape of answer.",
  promise: "The function door and the MCP door give the same cited answer, and the shell door's answer is caught as uncited.",
  production: "Start with a function. Move to MCP when a second team needs the tool. Use a command only when none exists.",
  cases: [
    { title: "NAIVE: always use the shell", why: "A command is easy to start with, so we use it for everything. The answer has no document id, so the output guardrail of lab 2 cannot check it.", question: "Cardioza", flags: { naive: "true", door: "cli" }, expect: "uncited" },
    { title: "The function door", why: "The same search as lab 1. It answers with the document id.", question: "Cardioza", flags: { door: "function" }, expect: "answered" },
    { title: "The MCP door", why: "The same answer, with the same document id, from a separate program. It is slower, because a server has to start.", question: "Cardioza", flags: { door: "mcp" }, expect: "answered" },
    { title: "Compare all three", why: "One table: the time, and whether the answer can be cited. Look at the time column and at the cited column.", question: "Cardioza", flags: { door: "all" }, expect: "compared" },
    { title: "Another country", why: "A German doctor. The function and MCP doors filter by country in the tool. The shell door filters by hand.", question: "Cardioza", flags: { door: "mcp", country: "DE" }, expect: "answered" },
    { title: "A drug with no document", why: "Every door says there is nothing. Good. No door guesses.", question: "Zorbex", flags: { door: "function" }, expect: "no-source" },
    { title: "A bad drug name through the shell", why: "The name hides a second command. The function door would only find nothing. The shell door must rely on lab 6's rules, and they refuse it.", question: "Cardioza; rm notes.txt", flags: { door: "cli" }, expect: "door-error" },
    { title: "The MCP server is down", why: "The function door has nothing to start, so it cannot be down. The MCP door fails with a clear error.", question: "Cardioza", flags: { door: "mcp", script: "src/missing-server.ts" }, expect: "door-error" },
  ],
  play(drug, flags) {
    const country = flags.country || "US";
    const server = flags.script || SERVER;
    print(field("Drug", drug));
    print(field("Country", country));
    if (flags.door === "all") return showAll(drug, country, server);
    const door = findDoor(flags.door || "function");
    if (!door) {
      box("ERROR", [red("Pick --door function, cli, mcp or all.")], red);
      return "error";
    }
    const trip = through(door, drug, country, server);
    rule(`DOOR: ${door.name.toUpperCase()}`);
    print(field("answer", trip.answer, trip.outcome === "answered" ? green : yellow));
    print(field("time", `${trip.milliseconds} ms`, dim));
    print(field("use when", WHEN[door.name], dim));
    if (trip.outcome === "uncited") box("UNCITED", [yellow("No document id. Lab 2's guardrail would block this.")], yellow);
    return trip.outcome;
  },
};

function showAll(drug: string, country: string, server: string): string {
  rule("THE SAME QUESTION, THREE DOORS");
  for (const door of DOORS) {
    const trip = through(door, drug, country, server);
    const cited = trip.outcome === "answered";
    const badge = cited ? badgeGreen("CITED") : badgeRed(trip.outcome.toUpperCase());
    console.log(`${bold(trip.door.padEnd(9))} ${badge} ${dim(`${trip.milliseconds} ms`)}`);
    print(field("", trip.answer, cyan, 10));
  }
  const advice: string[] = [];
  for (const name in WHEN) advice.push(...wrap(`${name}: ${WHEN[name]}`));
  box("HOW TO CHOOSE", advice, cyan);
  return "compared";
}

if (import.meta.main) runLab(lab);
// Run it (copy any line):
//   bun run lab 9 --question "Cardioza" --naive --door cli
//   bun run lab 9 --question "Cardioza" --door function
//   bun run lab 9 --question "Cardioza" --door mcp
//   bun run lab 9 --question "Cardioza" --door all
//   bun run lab 9 --demo