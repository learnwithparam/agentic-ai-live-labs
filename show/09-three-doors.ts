// What you see on screen for the three doors lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/09-three-doors.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, bold, box, cyan, dim, field, green } from "../src/ui";
import { print, red, rule, wrap, yellow } from "../src/ui";
import { answerThrough, DOORS, findDoor, PRICES_BY_SHELL, through } from "../labs/09-three-doors";

const WHEN: Record<string, string> = {
  function: "Your own rules, one team. Fastest and simplest. Nobody else can reuse it. Start here.",
  "price-file": "The price list in a file, read by a command. The number is right, but the answer has no source tag.",
  cli: "A tool that already exists as a command, such as gh for the repo. Needs the walls of the shell tool lab, and the output has no source tag.",
  mcp: "An outside app, or many teams share the tool. Slower to start, and needs the trust checks of the MCP trust lab.",
};

// One real job for each door, used by the comparison.
const JOBS: Record<string, string> = {
  function: "brand-kit",
  cli: "build-3",
  mcp: "book_slot | thursday-3pm",
};

export const lab: Lab = {
  file: "09-three-doors.ts",
  title: "Function, CLI or MCP",
  about:
    "Juniper's client chat has three jobs. The price list is Juniper's own code, so it is a function. The calendar and payment links belong to an outside app, so they use MCP. A build log lives in the repo, so a command reads it. Pick a door with --door function, cli or mcp, or use --door all to compare.",
  terms: ["door", "shell", "mcp"],
  challenge: "Teams pick a door by habit. Each door has its own cost, risk and speed. Most teams should ship functions first.",
  promise: "Own rules answer from a function and outside apps answer over MCP, both with a source tag. A shell answer has no tag, so it is caught as uncited.",
  production: "Start with a function. Prefer an answer with fields a program can read. Move to MCP when an outside app or a second team needs the tool.",
  cases: [
    { title: "NAIVE: the price list behind a shell", why: "The price list sits in a file, and a command reads it. The number is right, but the answer has no source tag, so the output check cannot verify it.", question: "What does a logo cost?", flags: { naive: "true", door: "cli" }, expect: "uncited" },
    { title: "Own rules are a function", why: "The price list is Juniper's own code. A function answers at once, with a source tag.", question: "What does a brand kit cost?", flags: { door: "function" }, expect: "answered" },
    { title: "An outside app over MCP", why: "The calendar belongs to a booking app. The model picks book_slot, and the server answers with a source tag. It is slower, because a server has to start.", question: "Book me in on Thursday at 3pm", flags: { door: "mcp" }, expect: "answered" },
    { title: "A payment link over MCP", why: "The same booking app also makes payment links. Same door, a different tool.", question: "Send me a payment link for the website", flags: { door: "mcp" }, expect: "answered" },
    { title: "The repo through a command", why: "A developer's question about a build. A command reads the log. This is fine for a developer. A client answer would need a source tag.", question: "Did build 3 pass or fail?", flags: { door: "cli" }, expect: "uncited" },
    { title: "Compare all three", why: "One table: the time, and whether the answer has a source tag. Look at the time column and at the tag column.", question: "Show me the three jobs please.", flags: { door: "all" }, expect: "compared" },
    { title: "A service with no price", why: "The function says it has no price. Good. It does not guess one.", question: "What does a mascot cost?", flags: { door: "function" }, expect: "no-source" },
    { title: "A booking with no time", why: "The client gave a day but no time. The booking app says so as an error, and the bot tells the client it could not book.", question: "Can we talk on Friday?", flags: { door: "mcp" }, expect: "door-error" },
    { title: "The booking app is down", why: "The function door has nothing to start, so it cannot be down. The MCP door fails with a clear error.", question: "Book me in on Monday at 10am", flags: { door: "mcp", script: "src/missing-server.ts" }, expect: "door-error" },
  ],
  play(question, flags) {
    const server = flags.script || "";
    print(field("Question", question));
    if (flags.door === "all") return showAll(server);
    const door = flags.naive ? PRICES_BY_SHELL : findDoor(flags.door || "function");
    if (!door) {
      box("ERROR", [red("Pick --door function, cli, mcp or all.")], red);
      return "error";
    }
    const told = answerThrough(door, question, modelFrom(flags), server);
    const trip = told.trip;
    rule("LOG, STEP BY STEP");
    for (const line of told.log) console.log(dim(line));
    console.log();
    rule(`DOOR: ${door.name.toUpperCase()}`);
    print(field("answer", trip.answer, trip.outcome === "answered" ? green : yellow));
    print(field("time", `${trip.milliseconds} ms`, dim));
    print(field("use when", WHEN[door.name], dim));
    if (trip.outcome === "uncited") box("UNCITED", [yellow("No source tag. The guardrails lab's guardrail would block this.")], yellow);
    return trip.outcome;
  },
};

function showAll(server: string): string {
  rule("THREE JOBS, THREE DOORS");
  for (const door of DOORS) {
    const trip = through(door, JOBS[door.name], server);
    const cited = trip.outcome === "answered";
    const badge = cited ? badgeGreen("TAGGED") : badgeRed(trip.outcome.toUpperCase());
    console.log(`${bold(trip.door.padEnd(9))} ${badge} ${dim(`${trip.milliseconds} ms`)}`);
    print(field("", trip.answer, cyan, 10));
  }
  const advice: string[] = [];
  for (const door of DOORS) advice.push(...wrap(`${door.name}: ${WHEN[door.name]}`));
  box("HOW TO CHOOSE", advice, cyan);
  return "compared";
}
