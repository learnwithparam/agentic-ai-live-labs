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
| 7. MCP basics | `bun labs/07-mcp-basics.ts --demo` | Run a real MCP server and client. |
| 8. Trusting an MCP server | `bun labs/08-mcp-trust.ts --demo` | Pin schemas, allow-list servers, catch a rug pull. |
| 14. Instructions versus data | `bun labs/14-instructions-vs-data.ts --demo` | Separate data from instructions at the edge. |
| 21. Crash and resume | `bun labs/21-crash-and-resume.ts --demo` | Kill the worker and replay with no duplicates. |
| 22. Budgets | `bun labs/22-budgets.ts --demo` | Hard caps in whole cents. |
| 23. Model routing and caching | `bun labs/23-model-routing.ts --demo` | Route by cost and fall back on failure. |
| 24. Identity and scopes | `bun labs/24-identity-and-scopes.ts --demo` | Least privilege per bot. |
| 25. Acting for a user | `bun labs/25-act-for-user.ts --demo` | Never exceed the rights of the person asking. |
| 26. Hooks | `bun labs/26-hooks.ts --demo` | Policy as code, before and after each call. |
| 27. Traces and the audit ledger | `bun labs/27-traces-and-audit.ts --demo` | A ledger where any edit is detected. |
| 28. Evals and the release gate | `bun labs/28-evals-and-release.ts --demo` | Evals that block a release. |
| 32. Subagents with their own context | `bun labs/32-subagent-isolation.ts --demo` | Isolate noisy work in a subagent. |
| 33. Handoffs between agents | `bun labs/33-handoffs.ts --demo` | Break handoff loops with a hop limit. |
| 34. Memory the bots share | `bun labs/34-shared-memory.ts --demo` | Memory that cannot be poisoned. |
| 35. Wakeups and the mission board | `bun labs/35-wakeups-and-board.ts --demo` | Wake agents on events and show a board. |
| 40. Put it all together | `bun labs/40-end-to-end.ts --demo` | Send one note through every guard, and check the record. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| 9. Function, CLI or MCP | `bun labs/09-three-doors.ts --demo` | Compare the three doors on risk and reuse. |
| 13. Picking the right context | `bun labs/13-pick-context.ts --demo` | Enforce context rules in code. |
| 18. Reflect and fix | `bun labs/18-reflect-and-fix.ts --demo` | Test a critic against its own blind spots. |
| 20. When tools fail | `bun labs/20-tool-failures.ts --demo` | Timeouts, backoff and bad input. |
| 31. Parallel workers | `bun labs/31-parallel-workers.ts --demo` | Fan out and merge without duplicates. |
| 36. One profile per doctor | `bun labs/36-hcp-360.ts --demo` | Identity resolution across systems. |
| 37. The PHI vault | `bun labs/37-phi-vault.ts --demo` | Reversible tokens for private data. |
| 38. The claim checker | `bun labs/38-fact-checker.ts --demo` | Check every claim against a source. |
| 39. Country rules and revocation | `bun labs/39-revocation.ts --demo` | Revoke a document everywhere, cache included. |

## When you finish

You can name the failure each control stops, and the case where it does not.

Next: add your own lab. See Add a lab in the main README.
