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
| Human in the loop gates | `bun run lab gates --demo` | Where should a person stop the run? |
| Workflow, one agent, multi-agent | `bun run lab shapes --demo` | Pick a shape for your own product. |
| Tool schemas and structured output | `bun run lab tool-schemas --demo` | Validate every tool call the model makes. |
| A shell tool, safely | `bun run lab shell-tool --demo` | Give an agent a shell without giving away the machine. |
| MCP basics | `bun run lab mcp-basics --demo` | Call tools from a real MCP server. |
| The context budget | `bun run lab context-budget --demo` | Set a budget for the prompt. |
| Trimming long history | `bun run lab history-trimming --demo` | Trim history without losing facts. |
| Retrieval | `bun run lab retrieval --demo` | Retrieve, rank and cite. |
| Picking the right context | `bun run lab pick-context --demo` | Filter by rule before you search. |
| Instructions versus data | `bun run lab instructions-vs-data --demo` | Keep outside text from becoming instructions. |
| Stop conditions | `bun run lab stop-conditions --demo` | Stop loops with caps and stuck-call checks. |
| Error feedback and retries | `bun run lab error-feedback --demo` | Retry with the error as feedback. |
| Plan, then act | `bun run lab plan-then-act --demo` | Plan, then act. |
| Reflect and fix | `bun run lab reflect-and-fix --demo` | Add a critic and see where it fails. |
| Run state | `bun run lab run-state --demo` | Record every run. |
| When tools fail | `bun run lab tool-failures --demo` | Handle slow and flaky tools. |
| Identity and scopes | `bun run lab identity-and-scopes --demo` | Give each bot only the tools it needs. |
| Hooks | `bun run lab hooks --demo` | Move rules out of the prompt and into hooks. |
| Traces and the audit ledger | `bun run lab traces-and-audit --demo` | Trace every step. |
| Evals and the release gate | `bun run lab evals-and-release --demo` | Write evals and block a bad release. |
| Routing | `bun run lab routing --demo` | Route to specialists. |
| Chains and delegation | `bun run lab chain-and-delegate --demo` | Chain steps and delegate to workers. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| The agent loop | `bun run lab agent-loop --demo` | Skim. You know this loop. |
| Guardrails and PHI redaction | `bun run lab guardrails --demo` | Skim the guardrails and note their limits. |
| Trusting an MCP server | `bun run lab mcp-trust --demo` | Pin tool schemas and catch a changed tool. |
| Function, CLI or MCP | `bun run lab three-doors --demo` | Pick between a function, a command and MCP. |
| Crash and resume | `bun run lab crash-and-resume --demo` | Resume after a crash. |
| Budgets | `bun run lab budgets --demo` | Cap cost and time. |
| Model routing and caching | `bun run lab model-routing --demo` | Route by difficulty and cache repeats. |
| Memory the bots share | `bun run lab shared-memory --demo` | Share memory without poisoning it. |
| One profile per doctor | `bun run lab hcp-360 --demo` | Use the ideas on one real job. |

## When you finish

You can ship an agent with a tested loop, bounded context and a trace you can read.

Next: [Advanced](advanced.md).
