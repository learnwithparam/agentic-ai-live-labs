// What you see on screen for the three doors lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/09-three-doors.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, bold, box, cyan, dim, field, green } from "../src/ui";
import { print, red, rule, wrap, yellow } from "../src/ui";
import { answerThrough, DOORS, findDoor, through } from "../labs/09-three-doors";
import { SERVER } from "../labs/07-mcp-basics";

const WHEN: Record<string, string> = {
  function: "Your own code, one team. Fastest and simplest. Nobody else can reuse it.",
  cli: "A tool that already exists as a command. Needs the four rules of the shell tool lab, and the output has no structure.",
  mcp: "Many agents or many teams share the tool. Slower to start, and needs the trust checks of the MCP trust lab.",
};

export const lab: Lab = {
  file: "09-three-doors.ts",
  title: "Function, CLI or MCP",
  about:
    "The question box takes a drug name. The same lookup runs through three doors. Pick one with --door function, cli or mcp, or use --door all to compare them.",
  terms: "door = the way an agent reaches a tool. latency = how long a call takes. structured = has fields a program can read.",
  challenge: "Teams pick a door by habit. Each door has a cost, a risk and a shape of answer.",
  promise: "The function door and the MCP door give the same cited answer. The shell door's answer is caught as uncited.",
  production: "Start with a function. Move to MCP when a second team needs the tool. Use a command only when none exists.",
  cases: [
    { title: "NAIVE: always use the shell", why: "A command is easy to start with, so we use it for everything. The answer has no document id, so the output guardrail of the guardrails lab cannot check it.", question: "What is the dose of Cardioza?", flags: { naive: "true", door: "cli" }, expect: "uncited" },
    { title: "The function door", why: "The same search as the agent loop. It answers with the document id.", question: "What is the dose of Cardioza?", flags: { door: "function" }, expect: "answered" },
    { title: "The MCP door", why: "The same answer, with the same document id, from a separate program. It is slower, because a server has to start.", question: "What is the dose of Cardioza?", flags: { door: "mcp" }, expect: "answered" },
    { title: "Compare all three", why: "One table: the time, and whether the answer can be cited. Look at the time column and at the cited column.", question: "What is the dose of Cardioza?", flags: { door: "all" }, expect: "compared" },
    { title: "Another country", why: "A German doctor. The function and MCP doors filter by country in the tool. The shell door filters by hand.", question: "What is the dose of Cardioza?", flags: { door: "mcp", country: "DE" }, expect: "answered" },
    { title: "A drug with no document", why: "Every door says there is nothing. Good. No door guesses.", question: "What is the dose of Zorbex?", flags: { door: "function" }, expect: "no-source" },
    { title: "A bad drug name through the shell", why: "The name hides a second command. The function door would only find nothing. The shell door must rely on the shell tool lab's rules, and they refuse it.", question: "What is the dose of Cardioza; rm notes.txt?", flags: { door: "cli" }, expect: "door-error" },
    { title: "The MCP server is down", why: "The function door has nothing to start, so it cannot be down. The MCP door fails with a clear error.", question: "What is the dose of Cardioza?", flags: { door: "mcp", script: "src/missing-server.ts" }, expect: "door-error" },
  ],
  play(question, flags) {
    const country = flags.country || "US";
    const server = flags.script || SERVER;
    print(field("Question", question));
    print(field("Country", country));
    if (flags.door === "all") return showAll(question, country, server);
    const door = findDoor(flags.door || "function");
    if (!door) {
      box("ERROR", [red("Pick --door function, cli, mcp or all.")], red);
      return "error";
    }
    const told = answerThrough(door, question, country, modelFrom(flags), server);
    const trip = told.trip;
    rule("LOG, STEP BY STEP");
    for (const line of told.log) console.log(dim(line));
    console.log();
    rule(`DOOR: ${door.name.toUpperCase()}`);
    print(field("answer", trip.answer, trip.outcome === "answered" ? green : yellow));
    print(field("time", `${trip.milliseconds} ms`, dim));
    print(field("use when", WHEN[door.name], dim));
    if (trip.outcome === "uncited") box("UNCITED", [yellow("No document id. The guardrails lab's guardrail would block this.")], yellow);
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
