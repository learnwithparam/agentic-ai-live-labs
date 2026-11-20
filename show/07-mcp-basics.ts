// What you see on screen for the MCP basics lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/07-mcp-basics.ts.

import { modelFrom, type Lab } from "../src/runner";
import { box, cyan, dim, field, green, highlight, print, red, rule, yellow } from "../src/ui";
import { askInbox, askNaive, callMcpTool, serverFor } from "../labs/07-mcp-basics";
import { HELLO, rpc, talk } from "../src/mcp-client";

export const lab: Lab = {
  file: "07-mcp-basics.ts",
  title: "MCP basics",
  about:
    "Maya's inbox manager has three MCP servers: Gmail, Slack and Drive. Each runs as a separate program and speaks JSON-RPC. Each has a search tool and a get_user tool. The agent lists the tools, picks the best two, and lets the model choose between them.",
  terms: ["mcp", "mcp-server", "json-rpc"],
  challenge: "Three servers give six tools, and two pairs share a name. Sending every tool on every call costs tokens and sends a call to the wrong server.",
  promise: "The model sees at most two tools. Each call goes to the server that owns the tool, and small talk sends no tools at all.",
  production: "Use the official MCP SDK and keep each server running. Search the tool descriptions, and show the model only the top few.",
  cases: [
    { title: "NAIVE: every tool on every call", why: "Six tools go to the model, and two are called get_user. The call goes to the first server with that name. That is Gmail, not Slack.", question: "Who is Dana on Slack?", flags: { naive: "true" }, expect: "wrong-server" },
    { title: "Two tools, the right server", why: "The tool search keeps two tools, and the Slack one is first. The call goes to Slack.", question: "Who is Dana on Slack?", expect: "answered" },
    { title: "Find an email", why: "The words signed and email point at the Gmail tools. The model sees only two tools.", question: "Find the signed contract email", expect: "answered" },
    { title: "Find a file", why: "Drive holds the brand guide. The Drive search tool is one of the two the model sees.", question: "Which file has the brand guide?", expect: "answered" },
    { title: "Who owns a file", why: "A who question picks the get_user tool. It is the Drive one, so the answer is the owner.", question: "Who owns the brand guide file?", expect: "answered" },
    { title: "Small talk", why: "A cheap check sees a greeting. No tool text is sent to the model, so the call costs almost nothing.", question: "Hello there, how are you?", expect: "no-tools" },
    { title: "Nothing found", why: "The tool runs but finds nothing. The bot says so, and does not make something up.", question: "Find the holiday thread in my mail", expect: "no-match" },
    { title: "A tool reports an error", why: "No mail has that word. The server marks the result as an error, and the client passes it on as text.", question: "Who sent the refund mail?", expect: "tool-error" },
    { title: "See the messages", why: "This is all MCP is: lines of JSON in, lines of JSON out. Read the method names and the tool list.", question: "Who is Dana on Slack?", flags: { show: "wire" }, expect: "listed" },
    { title: "A tool the server does not have", why: "The agent asks Slack for delete_everything. The server answers with a protocol error. The call goes nowhere.", question: "Delete all the Slack messages.", flags: { tool: "delete_everything" }, expect: "tool-error" },
    { title: "The servers are not there", why: "The path is wrong, so nothing answers. The client finds no tools and says so, instead of hanging.", question: "Who is Dana on Slack?", flags: { script: "src/missing-server.ts" }, expect: "no-server" },
  ],
  play(question, flags) {
    print(field("Question", question));
    if (flags.show === "wire") return showWire();
    if (flags.tool) {
      const result = callMcpTool(flags.tool, { text: question }, serverFor("slack"));
      print(field("call", flags.tool, cyan));
      print(field("result", result, result.startsWith("ERROR") ? red : green));
      return result.startsWith("ERROR") ? "tool-error" : "ran";
    }
    if (flags.naive) return showNaive(question, flags);
    const asked = askInbox(question, modelFrom(flags), flags.script || "");
    if (asked.outcome === "no-server") {
      box("NO SERVER", [red("No tools were found. Are the servers there?")], red);
      return asked.outcome;
    }
    rule("LOG, STEP BY STEP");
    for (const line of asked.log) console.log(dim(line));
    console.log();
    if (asked.shown.length > 0) print(field("tokens", `${asked.tokens} for the tools the model saw`, dim));
    const good = asked.outcome === "answered";
    box(good ? "ANSWER" : asked.outcome.toUpperCase(), field("", highlight(asked.answer), good ? green : yellow, 0), good ? green : yellow);
    return asked.outcome;
  },
};

function showNaive(question: string, flags: Record<string, string>): string {
  const asked = askNaive(question, modelFrom(flags));
  rule("EVERY TOOL, EVERY CALL");
  for (const line of asked.log) console.log(dim(line));
  print(field("tokens", `${asked.tokens} for six tools, on every call`, yellow));
  print(field("result", asked.answer, red));
  box("WRONG SERVER", [yellow("The question was about Slack. Gmail answered.")], yellow);
  return asked.outcome;
}

function showWire(): string {
  const requests = HELLO.concat([rpc(2, "tools/list")]);
  rule("WE SEND");
  for (const request of requests) console.log(dim(JSON.stringify(request).slice(0, 90)));
  rule("THE SLACK SERVER ANSWERS");
  for (const line of talk(requests, serverFor("slack"))) console.log(highlight(line.slice(0, 90)) + dim(" ..."));
  return "listed";
}
