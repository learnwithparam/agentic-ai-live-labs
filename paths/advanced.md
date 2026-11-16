# Path: Advanced

**For:** You run agents in production, or you lead the team that does.

**Goal:** Harden a multi-agent system: trust, recovery, cost, audit and release.

**Time:** 10 hours for the main steps, about most of an hour a lab.

## How to work

- Skip the explanations. Run --naive, then the fix.
- Find the case where each fix fails, and write it down.
- Compare the production line in each header with your own system.

## Do these

| Lab | Command | What to do |
| --- | --- | --- |
| 7. MCP basics | `bun run lab 7 --demo` | Run a real MCP server and client. |
| 8. Trusting an MCP server | `bun run lab 8 --demo` | Pin schemas, allow-list servers, catch a rug pull. |
| 14. Instructions versus data | `bun run lab 14 --demo` | Separate data from instructions at the edge. |
| 21. Crash and resume | `bun run lab 21 --demo` | Kill the worker and replay with no duplicates. |
| 22. Budgets | `bun run lab 22 --demo` | Hard caps in whole cents. |
| 23. Model routing and caching | `bun run lab 23 --demo` | Route by cost and fall back on failure. |
| 24. Identity and scopes | `bun run lab 24 --demo` | Least privilege per bot. |
| 25. Acting for a user | `bun run lab 25 --demo` | Never exceed the rights of the person asking. |
| 26. Hooks | `bun run lab 26 --demo` | Policy as code, before and after each call. |
| 27. Traces and the audit ledger | `bun run lab 27 --demo` | A ledger where any edit is detected. |
| 28. Evals and the release gate | `bun run lab 28 --demo` | Evals that block a release. |
| 32. Subagents with their own context | `bun run lab 32 --demo` | Isolate noisy work in a subagent. |
| 33. Handoffs between agents | `bun run lab 33 --demo` | Break handoff loops with a hop limit. |
| 34. Shared memory and skills | `bun run lab 34 --demo` | Memory that cannot be poisoned. |
| 35. Wakeups and the mission board | `bun run lab 35 --demo` | Wake agents on events and show a board. |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| 9. Function, CLI or MCP | `bun run lab 9 --demo` | Compare the three doors on risk and reuse. |
| 13. Picking the right context | `bun run lab 13 --demo` | Enforce context rules in code. |
| 18. Reflect and fix | `bun run lab 18 --demo` | Test a critic against its own blind spots. |
| 20. When tools fail | `bun run lab 20 --demo` | Timeouts, backoff and bad input. |
| 31. Parallel workers | `bun run lab 31 --demo` | Fan out and merge without duplicates. |
| 36. One profile per doctor | `bun run lab 36 --demo` | Identity resolution across systems. |
| 37. The PHI vault | `bun run lab 37 --demo` | Reversible tokens for private data. |
| 38. The claim checker | `bun run lab 38 --demo` | Check every claim against a source. |
| 39. Country rules and revocation | `bun run lab 39 --demo` | Revoke a document everywhere, cache included. |

## When you finish

You can name the failure each control stops, and the case where it does not.

Next: add your own lab. See Add a lab in the main README.
