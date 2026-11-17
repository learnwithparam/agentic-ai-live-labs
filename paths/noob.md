# Path: Noobs

**For:** You have never built with AI, and you may not code. You want to know what an agent is.

**Goal:** Explain an agent, a guardrail, a gate and a context window in plain words.

**Time:** 2 hours for the main steps, about a short sit-down a lab.

## How to work

- Run each lab with --demo and watch the output.
- Read the comments in PART 1. You do not need to read the code.
- In the menu, type one question of your own and see what happens.

## Do these

| Lab | Command | What to do |
| --- | --- | --- |
| The agent loop | `bun run lab agent-loop --demo` | Start here. The whole idea of an agent is one loop. |
| Guardrails and PHI redaction | `bun run lab guardrails --demo` | See private details hidden before the model reads them. |
| Human in the loop gates | `bun run lab gates --demo` | See the system stop and ask a person. |
| Workflow, one agent, multi-agent | `bun run lab shapes --demo` | Compare three ways to build the same helper. |
| The context budget | `bun run lab context-budget --demo` | Learn why the model cannot read everything. |
| Stop conditions | `bun run lab stop-conditions --demo` | See how a loop is told to stop. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| One profile per doctor | `bun run lab hcp-360 --demo` | See the ideas work on one real job. |

## When you finish

You can explain how an agent works to a friend, and you know what can go wrong.

Next: [Beginners](beginner.md).
