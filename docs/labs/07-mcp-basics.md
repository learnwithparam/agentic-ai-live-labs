# Lab 7: MCP basics

The agent from lab 1 gets its tools from a real MCP server, started as a separate program. Nothing is hard-coded. Use --hcp H-1, H-2 or H-3 to pick the doctor.

## The problem

Every new tool means new glue code in every agent. Tool lists go out of date.

## New words

MCP = a standard way for an agent to find and call tools. server = the program that owns the tools. JSON-RPC = the message format.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab 7 --question "Cardioza dose" --naive
bun run lab 7 --question "(not used)" --show wire
bun run lab 7 --question "Cardioza dose" --hcp H-1
bun run lab 7 --question "Cardioza dose" --hcp H-2 --country DE
bun run lab 7 --question "Zorbex dose"
bun run lab 7 --question "Cardioza dose" --hcp H-9
bun run lab 7 --question "anything" --tool delete_everything
bun run lab 7 --question "Cardioza dose" --script src/missing-server.ts
bun run lab 7 --demo
```

Run `bun run lab 7` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: a hard-coded tool list | The agent copied one tool into its own code. The server has more. The agent cannot use them, and nobody gets an error. | out-of-date | `bun run lab 7 --question "Cardioza dose" --naive` |
| 2 | See the messages | This is all MCP is: lines of JSON in, lines of JSON out. Read the method names and the tool list. | listed | `bun run lab 7 --question "(not used)" --show wire` |
| 3 | The agent uses the server's tools | The agent finds three tools, then calls them one by one. The answer cites its document. | answered | `bun run lab 7 --question "Cardioza dose" --hcp H-1` |
| 4 | Another country | Same server, a German doctor. The search tool filters by country, so the dose is 5mg. | answered | `bun run lab 7 --question "Cardioza dose" --hcp H-2 --country DE` |
| 5 | No approved document | The server says nothing was found. The agent refuses to guess. | no-source | `bun run lab 7 --question "Zorbex dose"` |
| 6 | A tool reports an error | Doctor H-9 does not exist. The server marks the result as an error, and the client passes it on as text. | tool-error | `bun run lab 7 --question "Cardioza dose" --hcp H-9` |
| 7 | A tool the server does not have | The agent asks for delete_everything. The server answers with a protocol error. The call goes nowhere. | tool-error | `bun run lab 7 --question "anything" --tool delete_everything` |
| 8 | The server is not there | The path is wrong, so nothing answers. The client finds no tools and says so, instead of hanging. | no-server | `bun run lab 7 --question "Cardioza dose" --script src/missing-server.ts` |

## The promise, and its test

The agent learns its tools from the server, so a new server tool needs no agent change.

```bash
bun test tests/promises/07.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Use the official MCP SDK, keep the server running, and add sign-in and a time limit to every call.

## Read the code

Open `labs/07-mcp-basics.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
