# Path: Advanced

**For:** You run agents in production, or you lead the team that does.

**Goal:** Harden a multi-agent system: trust, recovery, cost, audit and release.

**Time:** 10.5 hours for the main steps, about most of an hour a lab.

## How to work

- Skip the explanations. Run --naive, then the fix.
- Find the case where each fix fails, and write it down.
- Compare the production line in each header with your own system.

## Do these

| Lab | Command | What to do |
| --- | --- | --- |
| MCP basics | `bun run lab mcp-basics --demo` | Run a real MCP server and client. |
| Trusting an MCP server | `bun run lab mcp-trust --demo` | Pin schemas, allow-list servers, catch a rug pull. |
| Instructions versus data | `bun run lab instructions-vs-data --demo` | Separate data from instructions at the edge. |
| Crash and resume | `bun run lab crash-and-resume --demo` | Kill the worker and replay with no duplicates. |
| Budgets | `bun run lab budgets --demo` | Hard caps in whole cents. |
| Model routing and caching | `bun run lab model-routing --demo` | Route by cost and fall back on failure. |
| Identity and scopes | `bun run lab identity-and-scopes --demo` | Least privilege per bot. |
| Acting for a user | `bun run lab act-for-user --demo` | Never exceed the rights of the person asking. |
| Hooks | `bun run lab hooks --demo` | Policy as code, before and after each call. |
| Traces and the audit ledger | `bun run lab traces-and-audit --demo` | A ledger where any edit is detected. |
| Evals and the release gate | `bun run lab evals-and-release --demo` | Evals that block a release. |
| Subagents with their own context | `bun run lab subagent-isolation --demo` | Isolate noisy work in a subagent. |
| Handoffs between agents | `bun run lab handoffs --demo` | Break handoff loops with a hop limit. |
| Memory the bots share | `bun run lab shared-memory --demo` | Memory that cannot be poisoned. |
| Wakeups and the mission board | `bun run lab wakeups-and-board --demo` | Wake agents on events and show a board. |
| Put it all together | `bun run lab end-to-end --demo` | Send one note through every guard, and check the record. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| Function, CLI or MCP | `bun run lab three-doors --demo` | Compare the three doors on risk and reuse. |
| Picking the right context | `bun run lab pick-context --demo` | Enforce context rules in code. |
| Reflect and fix | `bun run lab reflect-and-fix --demo` | Test a critic against its own blind spots. |
| When tools fail | `bun run lab tool-failures --demo` | Timeouts, backoff and bad input. |
| Parallel workers | `bun run lab parallel-workers --demo` | Fan out and merge without duplicates. |
| One profile per doctor | `bun run lab hcp-360 --demo` | Identity resolution across systems. |
| The PHI vault | `bun run lab phi-vault --demo` | Reversible tokens for private data. |
| The claim checker | `bun run lab fact-checker --demo` | Check every claim against a source. |
| Country rules and revocation | `bun run lab revocation --demo` | Revoke a document everywhere, cache included. |

## When you finish

You can name the failure each control stops, and the case where it does not.

Next: add your own lab. See Add a lab in the main README.
