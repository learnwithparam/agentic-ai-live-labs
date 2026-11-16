# Agentic AI Live Labs

Four small labs on one problem: answering a doctor's drug question safely. Plain TypeScript, run with Bun, no install of any AI library and no API key.

All drugs, doctors and documents are invented.

## Start

```bash
bun install
bun test
```

Expect: `22 pass`

## Learning paths

Not sure where to start? Pick your path in [paths/README.md](paths/README.md): [Noobs](paths/noob.md), [Beginners](paths/beginner.md), [Intermediate](paths/intermediate.md), [Advanced](paths/advanced.md) or [Product managers](paths/pm.md). `bun run path beginner` shows a path in the terminal and marks which labs are ready. The paths are made from `src/roadmap.ts`, which also lists the labs still to come.

## How to read this repo

Each lab is one file. Open it and read PART 1. That is the whole idea, in plain code with comments. PART 2 below it only prints the result in colour, so skip it. Labs build on each other: lab 3 imports the loop from lab 1 and the guardrails from lab 2, with a comment on each import.

## Three ways to run any lab

```bash
bun run lab             # list the labs
bun run lab 1          # menu: pick an example by number, or type your own question
bun run lab 1 --demo   # every edge case in order, with a "Why" for each
bun run lab 1 --question "Is Zorbex safe for children?"   # one question
```

`--demo` is the fastest way to learn. Every case shows why it behaves as it does and the exact command to repeat it, then marks it EXPECTED or SURPRISE. Colour turns off when output is piped or `NO_COLOR` is set. `FORCE_COLOR=1` turns it on.

## The pretend model

Every lab calls `callLlm` from `src/model.ts`, a small rule-based stand-in, so the labs run offline and give the same answer every time. You do not need to read it. It can behave three ways with `--model`:

- `ok`: follows the rules (default).
- `nocite`: gives a right answer but forgets the citation.
- `invent`: cites a real document but states a wrong dose.

To use a real provider, replace `makeModel` with a function that takes messages and returns a tool call or text. The labs do not change.

## The labs and their edge cases

| Lab | File | Core idea | Edge cases shown |
| --- | --- | --- | --- |
| 1 | `labs/01-agent-loop.ts` | The loop: model asks, code runs a tool, repeat | unknown drug, drug approved only in another country, spelling mistake, small talk, capital letters, two drugs, step limit |
| 2 | `labs/02-guardrails.ts` | Mask patient details in, block uncited replies out | name, SSN, phone, email, record number, birth date, formats the patterns miss, wrong dose with a valid citation |
| 3 | `labs/03-gates.ts` | A person approves or rejects at two gates | no gate, gate 1 yes and no, gate 2 yes and no, masked patient details |
| 4 | `labs/04-shapes.ts` | Workflow, one agent, multi-agent | unknown doctor, no outreach, no document, auditor catches a wrong dose, a person overrides the auditor |
| 5 | `labs/05-tool-schemas.ts` | Check a tool call against a schema before it runs | lower-case country, number as text, extra field, missing field, bad country, out of range, not JSON |
| 6 | `labs/06-shell-tool.ts` | A shell with an allow-list, one folder and a time limit | rm, chained commands, `..`, absolute path, missing file, a command that never ends |
| 7 | `labs/07-mcp-basics.ts` | Discover and call tools on a real MCP server | the raw messages, a tool error, a tool the server lacks, a server that is not there |
| 8 | `labs/08-mcp-trust.ts` | Approve servers, pin tools, catch a rug pull | unknown server, changed tool, new tool, hidden order, re-approval |
| 9 | `labs/09-three-doors.ts` | Function, CLI or MCP for the same job | time, uncited shell output, a hidden command, a server that is down |

Every lab from 5 on also shows its words, the challenge, the promise and what it becomes in production. Case 1 of each is the NAIVE failure, and `--naive` runs the whole menu that way. A test in `tests/promises/` proves each promise, and `bun run check` fails if one is missing.

Lab 3 and lab 4 take `--approve y` or `--approve n` to answer a gate without typing. Lab 4 takes `--shape workflow|agent|multi` and `--hcp H-1|H-2|H-3` (US cardiology, DE cardiology, US neurology).

Other files: `src/data.ts` holds the invented documents, doctors and emails. `src/ui.ts` and `src/runner.ts` draw the colour and run the menu and demo.

## Add a lab

Every lab follows the same shape, so you can add as many as you like.

1. Copy `scripts/lab-template.ts` to `labs/05-your-name.ts`.
2. Write the idea in PART 1 as plain functions. Write the examples in `cases`. Add edge cases.
3. Run `bun run lab 5 --demo`, then `bun run check`.

`bun run check` runs three things. The tests find every file in `labs/` by themselves and run all its cases. The readable gate (`scripts/readable.ts`) fails a lab whose PART 1 uses regex, arrow functions, `.map`, spread, `?.`, `??` or ternaries, uses a short or abbreviated name, has a line over 100 characters, or has a sentence over 25 words. The type check runs last.

## What this does not do

- Redaction is pattern based. It catches the formats it lists and nothing else, so a real system needs more.
- The auditor checks each cited sentence word for word against its document. A real auditor would be a second model.
