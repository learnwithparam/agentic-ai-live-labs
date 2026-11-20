// What you see on screen for the MCP basics lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/07-mcp-basics.ts.

import { CRM } from "../src/data";
import { modelFrom, type Lab } from "../src/runner";
import { box, cyan, dim, field, green, highlight, print, red, rule, yellow } from "../src/ui";
import { askWithMcp, callMcpTool, discoverTools, HELLO, rpc, SERVER, talk } from "../labs/07-mcp-basics";
import { searchOnly } from "../labs/01-agent-loop";

export const lab: Lab = {
  file: "07-mcp-basics.ts",
  title: "MCP basics",
  about:
    "The agent gets its tools from a real MCP server. That server runs as a separate program and speaks JSON-RPC messages. Nothing is hard-coded. Use --hcp dr-lee, dr-weber or dr-rao to pick the doctor.",
  terms: ["mcp", "mcp-server", "json-rpc"],
  challenge: "Every new tool means new glue code in every agent. Tool lists go out of date.",
  promise: "The agent learns its tools from the server, so a new server tool needs no agent change.",
  production: "Use the official MCP SDK and keep the server running. Add sign-in and a time limit to every call.",
  cases: [
    { title: "NAIVE: a hard-coded tool list", why: "The agent copied one tool into its own code. The server has more. The agent cannot use them, and nobody gets an error.", question: "What is the dose of Cardioza?", flags: { naive: "true" }, expect: "out-of-date" },
    { title: "See the messages", why: "This is all MCP is: lines of JSON in, lines of JSON out. Read the method names and the tool list.", question: "What is the dose of Cardioza?", flags: { show: "wire" }, expect: "listed" },
    { title: "The agent uses the server's tools", why: "The agent finds three tools, then calls them one by one. The answer cites its document.", question: "What is the dose of Cardioza?", flags: { hcp: "dr-lee" }, expect: "answered" },
    { title: "Another country", why: "Same server, a German doctor. The search tool filters by country, so the dose is 5mg.", question: "What is the dose of Cardioza?", flags: { hcp: "dr-weber", country: "DE" }, expect: "answered" },
    { title: "No approved document", why: "The server says nothing was found. The agent refuses to guess.", question: "What is the dose of Zorbex?", expect: "no-source" },
    { title: "A tool reports an error", why: "Doctor dr-unknown does not exist. The server marks the result as an error, and the client passes it on as text.", question: "What is the dose of Cardioza?", flags: { hcp: "dr-unknown" }, expect: "tool-error" },
    { title: "A tool the server does not have", why: "The agent asks for delete_everything. The server answers with a protocol error. The call goes nowhere.", question: "What is the dose of Cardioza?", flags: { tool: "delete_everything" }, expect: "tool-error" },
    { title: "The server is not there", why: "The path is wrong, so nothing answers. The client finds no tools and says so, instead of hanging.", question: "What is the dose of Cardioza?", flags: { script: "src/missing-server.ts" }, expect: "no-server" },
  ],
  play(question, flags) {
    const script = flags.script || SERVER;
    const hcpId = flags.hcp || "dr-lee";
    const country = flags.country || (CRM[hcpId] ? CRM[hcpId].country : "US");
    if (flags.naive) return showNaive(script);
    if (flags.show === "wire") return showWire(script);
    if (flags.tool) {
      const result = callMcpTool(flags.tool, { query: question, country, hcpId }, script);
      print(field("call", flags.tool, cyan));
      print(field("result", result, result.startsWith("ERROR") ? red : green));
      return result.startsWith("ERROR") ? "tool-error" : "ran";
    }
    print(field("Server", script));
    const asked = askWithMcp(question, country, hcpId, modelFrom(flags), script);
    if (asked.tools.length === 0) {
      box("NO SERVER", [red("No tools were found. Is the server there?")], red);
      return "no-server";
    }
    rule("LOG, STEP BY STEP");
    for (const line of asked.log) console.log(dim(line));
    console.log();
    const failed = asked.log.join(" ").includes("returned: ERROR");
    if (failed) {
      box("A TOOL FAILED", [yellow(asked.answer)], yellow);
      return "tool-error";
    }
    const cited = /\[[A-Z]+-[A-Z]+\]/.test(asked.answer);
    box(cited ? "ANSWER" : "NO APPROVED SOURCE", field("", highlight(asked.answer), cited ? green : yellow, 0), cited ? green : yellow);
    return cited ? "answered" : "no-source";
  },
};

function showNaive(script: string): string {
  const fixed = searchOnly.map((tool) => tool.name);
  const real = discoverTools(script);
  print(field("hard-coded", fixed.join(", "), yellow));
  print(field("on server", real.join(", "), cyan));
  const missing = real.filter((name) => !fixed.includes(name));
  box("OUT OF DATE", [yellow(`The agent cannot use: ${missing.join(", ")}`)], yellow);
  return missing.length > 0 ? "out-of-date" : "same";
}

function showWire(script: string): string {
  const requests = HELLO.concat([rpc(2, "tools/list")]);
  rule("WE SEND");
  for (const request of requests) console.log(dim(JSON.stringify(request).slice(0, 90)));
  rule("THE SERVER ANSWERS");
  for (const line of talk(requests, script)) console.log(highlight(line.slice(0, 90)) + dim(" ..."));
  return "listed";
}
