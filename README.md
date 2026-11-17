# Agentic AI Live Labs

Thirty-nine small labs on one job: answer a doctor's drug question safely. Each lab shows one idea.

It is plain TypeScript. You run it with Bun. You need no AI library and no API key.

All drugs, doctors and documents are invented.

## Start

```bash
bun install
bun test
```

Expect: `0 fail`

Then open the first lab and run it.

```bash
bun labs/01-agent-loop.ts --demo
```

Expect: a list of cases. Each one has a "Why" and a command to repeat it.

## How a lab works

Every lab has the same two files.

- `labs/NN-name.ts` holds the lesson. It is a short story, then numbered steps in code.
- `show/NN-name.ts` holds the examples and the screen output. You do not need to read it.

The steps in the code have numbers. The run prints a log with the same numbers. So you can match what you read with what you see.

For example, lab 21 kills the program in the middle of a job. Step 1 in the code checks the ledger. The log prints "Step 1: H-1 is in the ledger, so it is skipped."

## Three ways to run a lab

```bash
bun labs/01-agent-loop.ts --demo
bun labs/01-agent-loop.ts --question "Is Zorbex safe for children?"
bun labs/01-agent-loop.ts
```

Expect: the first line runs every case. The second runs one question. The third shows a menu.

Every lab opens with the problem. Case 1 is always the naive way, and it fails on purpose. Add `--naive` to run a whole lab that way.

## Use a real model

The labs run offline on a pretend model. To use a real one, add `--live` to any command.

```bash
bun labs/01-agent-loop.ts --question "What is the dose of Cardioza for Dr. Lee?" --live
```

Expect: the same lab, with a real model behind it.

It uses OpenRouter and your own key in `OPENROUTER_API_KEY`. The key is never printed. The lab code does not change.

## When something looks wrong

| What you see | What it means | Fix |
| --- | --- | --- |
| The terminal says it cannot find bun | Bun is not installed | Install Bun, then open a new terminal |
| The run asks for a key | You added `--live` | Set `OPENROUTER_API_KEY`, or remove `--live` |
| A case says SURPRISE | The result is not the one the lab expected | Read its "Why". With `--live`, a real model can differ |
| `bun run check` fails on a long line | A lab breaks the plain style | Split the line. Keep each line under 101 letters |
| A lab file will not run | The command has no file name | Write `bun labs/01-agent-loop.ts`, not a number |

Common wrong turn: you read `show/NN-name.ts` first. It only prints things. The lesson is in `labs/NN-name.ts`.

## The labs

The labs are in eight tracks. Pick a learning path in [paths/README.md](paths/README.md), or go in order.

| Track | Labs | What you learn |
| --- | --- | --- |
| Foundations | 1 to 4 | The loop, guardrails, a person in the loop, and three shapes |
| Tools and protocols | 5 to 9 | Schemas, a safe shell, MCP, and trust |
| Context engineering | 10 to 14 | What the model reads, and how to choose it |
| Loop engineering | 15 to 18 | How a loop ends well, and how it recovers |
| Agent runtime | 19 to 23 | State, failures, crashes, cost and routing |
| Harness engineering | 24 to 28 | Identity, hooks, audit and release checks |
| Teammate patterns | 29 to 35 | Many agents that work as one team |
| HCP case study | 36 to 39 | The ideas used together on one real job |

Each lab has a page in `docs/labs/`. It lists the new words, the problem, the promise, and every example.

## Add a lab

1. Copy `scripts/lab-template.ts` to `labs/40-your-name.ts`.
2. Write the lesson as plain steps. Write the examples in `show/40-your-name.ts`.
3. Write one test in `tests/promises/` that proves the promise.
4. Run `bun run check`.

The check runs the tests and the style gates. It also breaks each rule on purpose, and a test must fail every time.

For example, if you remove the audit line in lab 37, the audit test must fail. If it does not, the check names the rule that was missed.

## What this does not do

- Hiding private data uses patterns. It finds the formats it knows and nothing else.
- The auditor compares each cited sentence word for word. A real system may use a second model.
- The pretend model follows rules. It is a stand-in, so use `--live` to see a real model.
