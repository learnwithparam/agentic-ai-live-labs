# Lab 9: function, CLI or MCP

The question box takes a drug name. The same lookup runs through three doors. Pick one with --door function, cli or mcp, or use --door all to compare them.

## The problem

Teams pick a door by habit. Each door has a cost, a risk and a shape of answer.

## New words

door = the way an agent reaches a tool. latency = how long a call takes. structured = has fields a program can read.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --naive --door cli
bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door function
bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door mcp
bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door all
bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door mcp --country DE
bun labs/09-three-doors.ts --question "What is the dose of Zorbex?" --door function
bun labs/09-three-doors.ts --question "What is the dose of Cardioza; rm notes.txt?" --door cli
bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door mcp --script src/missing-server.ts
bun labs/09-three-doors.ts --demo
```

Run `bun labs/09-three-doors.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: always use the shell | A command is easy to start with, so we use it for everything. The answer has no document id, so the output guardrail of lab 2 cannot check it. | uncited | `bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --naive --door cli` |
| 2 | The function door | The same search as lab 1. It answers with the document id. | answered | `bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door function` |
| 3 | The MCP door | The same answer, with the same document id, from a separate program. It is slower, because a server has to start. | answered | `bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door mcp` |
| 4 | Compare all three | One table: the time, and whether the answer can be cited. Look at the time column and at the cited column. | compared | `bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door all` |
| 5 | Another country | A German doctor. The function and MCP doors filter by country in the tool. The shell door filters by hand. | answered | `bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door mcp --country DE` |
| 6 | A drug with no document | Every door says there is nothing. Good. No door guesses. | no-source | `bun labs/09-three-doors.ts --question "What is the dose of Zorbex?" --door function` |
| 7 | A bad drug name through the shell | The name hides a second command. The function door would only find nothing. The shell door must rely on lab 6's rules, and they refuse it. | door-error | `bun labs/09-three-doors.ts --question "What is the dose of Cardioza; rm notes.txt?" --door cli` |
| 8 | The MCP server is down | The function door has nothing to start, so it cannot be down. The MCP door fails with a clear error. | door-error | `bun labs/09-three-doors.ts --question "What is the dose of Cardioza?" --door mcp --script src/missing-server.ts` |

## The promise, and its test

The function door and the MCP door give the same cited answer. The shell door's answer is caught as uncited.

```bash
bun test tests/promises/09.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Start with a function. Move to MCP when a second team needs the tool. Use a command only when none exists.

## Read the code

Open `labs/09-three-doors.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
