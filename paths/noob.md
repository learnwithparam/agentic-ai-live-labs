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
| 1. The agent loop | `bun labs/01-agent-loop.ts --demo` | Start here. The whole idea of an agent is one loop. |
| 2. Guardrails and PHI redaction | `bun labs/02-guardrails.ts --demo` | See private details hidden before the model reads them. |
| 3. Human in the loop gates | `bun labs/03-gates.ts --demo` | See the system stop and ask a person. |
| 4. Workflow, one agent, multi-agent | `bun labs/04-shapes.ts --demo` | Compare three ways to build the same helper. |
| 10. The context budget | `bun labs/10-context-budget.ts --demo` | Learn why the model cannot read everything. |
| 15. Stop conditions | `bun labs/15-stop-conditions.ts --demo` | See how a loop is told to stop. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| 36. One profile per doctor | `bun labs/36-hcp-360.ts --demo` | See the ideas work on one real job. |

## When you finish

You can explain how an agent works to a friend, and you know what can go wrong.

Next: [Beginners](beginner.md).
