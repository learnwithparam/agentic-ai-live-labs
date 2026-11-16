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
| 1. The agent loop | `bun labs/01-agent-loop.ts --demo` | Read the loop and change the step limit. |
| 2. Guardrails and PHI redaction | `bun labs/02-guardrails.ts --demo` | Read how private details are found, word by word. |
| 3. Human in the loop gates | `bun labs/03-gates.ts --demo` | Read the gate. Only a yes sends the message. |
| 4. Workflow, one agent, multi-agent | `bun labs/04-shapes.ts --demo` | Read the three shapes side by side. |
| 5. Tool schemas and structured output | `bun labs/05-tool-schemas.ts --demo` | Check what the model sends before you run a tool. |
| 10. The context budget | `bun labs/10-context-budget.ts --demo` | Count what goes into a prompt. |
| 11. Trimming long history | `bun labs/11-history-trimming.ts --demo` | Keep what matters when the chat gets long. |
| 12. Retrieval | `bun labs/12-retrieval.ts --demo` | Find the right passage and cite it. |
| 15. Stop conditions | `bun labs/15-stop-conditions.ts --demo` | Stop a loop that never ends. |
| 16. Error feedback and retries | `bun labs/16-error-feedback.ts --demo` | Give the model its error and try again. |
| 19. Run state | `bun labs/19-run-state.ts --demo` | Keep a record of each run. |
| 29. Routing | `bun labs/29-routing.ts --demo` | Send each request to the right helper. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| 6. A shell tool, safely | `bun labs/06-shell-tool.ts --demo` | Let an agent run a command, safely. |
| 14. Instructions versus data | `bun labs/14-instructions-vs-data.ts --demo` | See why an email cannot give orders. |
| 17. Plan, then act | `bun labs/17-plan-then-act.ts --demo` | Make a plan before acting. |
| 36. One profile per doctor | `bun labs/36-hcp-360.ts --demo` | Use the ideas on one real job. |

## When you finish

You can build a small agent with a loop, a guardrail and a gate, and say why it is safe.

Next: [Intermediate](intermediate.md).
