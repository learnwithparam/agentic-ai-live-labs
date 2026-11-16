# Path: Intermediate

**For:** You have called an LLM API inside an app. You want it to work reliably.

**Goal:** Design the context, the loop and the checks around a model, and test them.

**Time:** 11 hours for the main steps, about 30 minutes a lab.

## How to work

- Skim the code and focus on the cases that fail.
- Run --naive first, then compare it with the fix.
- Write one new case per lab that breaks the fix.

## Do these

| Lab | Command | What to do |
| --- | --- | --- |
| 3. Human in the loop gates | `bun run lab 3 --demo` | Where should a person stop the run? |
| 4. Workflow, one agent, multi-agent | `bun run lab 4 --demo` | Pick a shape for your own product. |
| 5. Tool schemas and structured output | `bun run lab 5 --demo` | Validate every tool call the model makes. |
| 6. A shell tool, safely | `bun run lab 6 --demo` | Give an agent a shell without giving away the machine. |
| 7. MCP basics | `bun run lab 7 --demo` | Call tools from a real MCP server. |
| 10. The context budget | `bun run lab 10 --demo` | Set a budget for the prompt. |
| 11. Trimming long history | `bun run lab 11 --demo` | Trim history without losing facts. |
| 12. Retrieval | `bun run lab 12 --demo` | Retrieve, rank and cite. |
| 13. Picking the right context | `bun run lab 13 --demo` | Filter by rule before you search. |
| 14. Instructions versus data | `bun run lab 14 --demo` | Keep outside text from becoming instructions. |
| 15. Stop conditions | `bun run lab 15 --demo` | Stop loops with caps and stuck-call checks. |
| 16. Error feedback and retries | `bun run lab 16 --demo` | Retry with the error as feedback. |
| 17. Plan, then act | `bun run lab 17 --demo` | Plan, then act. |
| 18. Reflect and fix | `bun run lab 18 --demo` | Add a critic and see where it fails. |
| 19. Run state | `bun run lab 19 --demo` | Record every run. |
| 20. When tools fail | `bun run lab 20 --demo` | Handle slow and flaky tools. |
| 24. Identity and scopes | `bun run lab 24 --demo` | Give each bot only the tools it needs. |
| 26. Hooks | `bun run lab 26 --demo` | Move rules out of the prompt and into hooks. |
| 27. Traces and the audit ledger | `bun run lab 27 --demo` | Trace every step. |
| 28. Evals and the release gate | `bun run lab 28 --demo` | Write evals and block a bad release. |
| 29. Routing | `bun run lab 29 --demo` | Route to specialists. |
| 30. Chains and delegation | `bun run lab 30 --demo` | Chain steps and delegate to workers. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| 1. The agent loop | `bun run lab 1 --demo` | Skim. You know this loop. |
| 2. Guardrails and PHI redaction | `bun run lab 2 --demo` | Skim the guardrails and note their limits. |
| 8. Trusting an MCP server | `bun run lab 8 --demo` | Pin tool schemas and catch a changed tool. |
| 9. Function, CLI or MCP | `bun run lab 9 --demo` | Pick between a function, a command and MCP. |
| 21. Crash and resume | `bun run lab 21 --demo` | Resume after a crash. |
| 22. Budgets | `bun run lab 22 --demo` | Cap cost and time. |
| 23. Model routing and caching | `bun run lab 23 --demo` | Route by difficulty and cache repeats. |
| 34. Shared memory and skills | `bun run lab 34 --demo` | Share memory without poisoning it. |
| 36. One profile per doctor | `bun run lab 36 --demo` | Use the ideas on one real job. |

## When you finish

You can ship an agent with a tested loop, bounded context and a trace you can read.

Next: [Advanced](advanced.md).
