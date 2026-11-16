# Path: Intermediate

**For:** You have called an LLM API inside an app. You want it to work reliably.

**Goal:** Design the context, the loop and the checks around a model, and test them.

**Time:** 11 hours for the main steps, about half an hour a lab.

## How to work

- Skim the code and focus on the cases that fail.
- Run --naive first, then compare it with the fix.
- Write one new case per lab that breaks the fix.

## Do these

| Lab | Command | What to do |
| --- | --- | --- |
| 3. Human in the loop gates | `bun labs/03-gates.ts --demo` | Where should a person stop the run? |
| 4. Workflow, one agent, multi-agent | `bun labs/04-shapes.ts --demo` | Pick a shape for your own product. |
| 5. Tool schemas and structured output | `bun labs/05-tool-schemas.ts --demo` | Validate every tool call the model makes. |
| 6. A shell tool, safely | `bun labs/06-shell-tool.ts --demo` | Give an agent a shell without giving away the machine. |
| 7. MCP basics | `bun labs/07-mcp-basics.ts --demo` | Call tools from a real MCP server. |
| 10. The context budget | `bun labs/10-context-budget.ts --demo` | Set a budget for the prompt. |
| 11. Trimming long history | `bun labs/11-history-trimming.ts --demo` | Trim history without losing facts. |
| 12. Retrieval | `bun labs/12-retrieval.ts --demo` | Retrieve, rank and cite. |
| 13. Picking the right context | `bun labs/13-pick-context.ts --demo` | Filter by rule before you search. |
| 14. Instructions versus data | `bun labs/14-instructions-vs-data.ts --demo` | Keep outside text from becoming instructions. |
| 15. Stop conditions | `bun labs/15-stop-conditions.ts --demo` | Stop loops with caps and stuck-call checks. |
| 16. Error feedback and retries | `bun labs/16-error-feedback.ts --demo` | Retry with the error as feedback. |
| 17. Plan, then act | `bun labs/17-plan-then-act.ts --demo` | Plan, then act. |
| 18. Reflect and fix | `bun labs/18-reflect-and-fix.ts --demo` | Add a critic and see where it fails. |
| 19. Run state | `bun labs/19-run-state.ts --demo` | Record every run. |
| 20. When tools fail | `bun labs/20-tool-failures.ts --demo` | Handle slow and flaky tools. |
| 24. Identity and scopes | `bun labs/24-identity-and-scopes.ts --demo` | Give each bot only the tools it needs. |
| 26. Hooks | `bun labs/26-hooks.ts --demo` | Move rules out of the prompt and into hooks. |
| 27. Traces and the audit ledger | `bun labs/27-traces-and-audit.ts --demo` | Trace every step. |
| 28. Evals and the release gate | `bun labs/28-evals-and-release.ts --demo` | Write evals and block a bad release. |
| 29. Routing | `bun labs/29-routing.ts --demo` | Route to specialists. |
| 30. Chains and delegation | `bun labs/30-chain-and-delegate.ts --demo` | Chain steps and delegate to workers. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| 1. The agent loop | `bun labs/01-agent-loop.ts --demo` | Skim. You know this loop. |
| 2. Guardrails and PHI redaction | `bun labs/02-guardrails.ts --demo` | Skim the guardrails and note their limits. |
| 8. Trusting an MCP server | `bun labs/08-mcp-trust.ts --demo` | Pin tool schemas and catch a changed tool. |
| 9. Function, CLI or MCP | `bun labs/09-three-doors.ts --demo` | Pick between a function, a command and MCP. |
| 21. Crash and resume | `bun labs/21-crash-and-resume.ts --demo` | Resume after a crash. |
| 22. Budgets | `bun labs/22-budgets.ts --demo` | Cap cost and time. |
| 23. Model routing and caching | `bun labs/23-model-routing.ts --demo` | Route by difficulty and cache repeats. |
| 34. Shared memory and skills | `bun labs/34-shared-memory-and-skills.ts --demo` | Share memory without poisoning it. |
| 36. One profile per doctor | `bun labs/36-hcp-360.ts --demo` | Use the ideas on one real job. |

## When you finish

You can ship an agent with a tested loop, bounded context and a trace you can read.

Next: [Advanced](advanced.md).
