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
| 1. The agent loop | `bun run lab 1 --demo` | Read the loop and change the step limit. |
| 2. Guardrails and PHI redaction | `bun run lab 2 --demo` | Read how private details are found, word by word. |
| 3. Human in the loop gates | `bun run lab 3 --demo` | Read the gate. Only a yes sends the message. |
| 4. Workflow, one agent, multi-agent | `bun run lab 4 --demo` | Read the three shapes side by side. |
| 5. Tool schemas and structured output | `bun run lab 5 --demo` | Check what the model sends before you run a tool. |
| 10. The context budget | `bun run lab 10 --demo` | Count what goes into a prompt. |
| 11. Trimming long history | `bun run lab 11 --demo` | Keep what matters when the chat gets long. |
| 12. Retrieval | `bun run lab 12 --demo` | Find the right passage and cite it. |
| 15. Stop conditions | `bun run lab 15 --demo` | Stop a loop that never ends. |
| 16. Error feedback and retries | `bun run lab 16 --demo` | Give the model its error and try again. |
| 19. Run state | `bun run lab 19 --demo` | Keep a record of each run. |
| 29. Routing | `bun run lab 29 --demo` | Send each request to the right helper. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| 6. A shell tool, safely | `bun run lab 6 --demo` | Let an agent run a command, safely. |
| 14. Instructions versus data | `bun run lab 14 --demo` | See why an email cannot give orders. |
| 17. Plan, then act | `bun run lab 17 --demo` | Make a plan before acting. |
| 36. One profile per doctor | `bun run lab 36 --demo` | Use the ideas on one real job. |

## When you finish

You can build a small agent with a loop, a guardrail and a gate, and say why it is safe.

Next: [Intermediate](intermediate.md).
