# Path: Beginners

**For:** You can write simple code, such as functions and loops. Agents are new to you.

**Goal:** Read and change a small agent, and fix the common problems.

**Time:** 6 hours for the main steps, about half an hour a lab.

## How to work

- Run the demo first, then read PART 1 line by line.
- Run the first case with --naive to see the problem before the fix.
- Change one case and one line of PART 1, then run the lab again.

## Do these

| Lab | Command | What to do |
| --- | --- | --- |
| The agent loop | `bun run lab agent-loop --demo` | Read the loop and change the step limit. |
| Guardrails and PHI redaction | `bun run lab guardrails --demo` | Read how private details are found, word by word. |
| Human in the loop gates | `bun run lab gates --demo` | Read the gate. Only a yes sends the message. |
| Workflow, one agent, multi-agent | `bun run lab shapes --demo` | Read the three shapes side by side. |
| Tool schemas and structured output | `bun run lab tool-schemas --demo` | Check what the model sends before you run a tool. |
| The context budget | `bun run lab context-budget --demo` | Count what goes into a prompt. |
| Trimming long history | `bun run lab history-trimming --demo` | Keep what matters when the chat gets long. |
| Retrieval | `bun run lab retrieval --demo` | Find the right passage and cite it. |
| Stop conditions | `bun run lab stop-conditions --demo` | Stop a loop that never ends. |
| Error feedback and retries | `bun run lab error-feedback --demo` | Give the model its error and try again. |
| Run state | `bun run lab run-state --demo` | Keep a record of each run. |
| Routing | `bun run lab routing --demo` | Send each request to the right helper. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| A shell tool, safely | `bun run lab shell-tool --demo` | Let an agent run a command, safely. |
| Instructions versus data | `bun run lab instructions-vs-data --demo` | See why an email cannot give orders. |
| Plan, then act | `bun run lab plan-then-act --demo` | Make a plan before acting. |
| One profile per doctor | `bun run lab hcp-360 --demo` | Use the ideas on one real job. |

## When you finish

You can build a small agent with a loop, a guardrail and a gate. You can say why it is safe.

Next: [Intermediate](intermediate.md).
