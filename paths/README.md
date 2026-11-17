# Learning paths

Pick the path that matches you. Every path uses the same labs in a different order.

| Path | For | Labs | Time |
| --- | --- | --- | --- |
| [Noobs](noob.md) | You have never built with AI, and you may not code. You want to know what an agent is. | 6 main, 1 optional | 2 hours |
| [Beginners](beginner.md) | You can write simple code, such as functions and loops. Agents are new to you. | 12 main, 4 optional | 6 hours |
| [Intermediate](intermediate.md) | You have called an LLM API inside an app. You want it to work reliably. | 22 main, 9 optional | 11 hours |
| [Advanced](advanced.md) | You run agents in production, or you lead the team that does. | 15 main, 9 optional | 10 hours |
| [Product managers](pm.md) | You decide what ships and what is safe. You do not need to read code. | 12 main, 2 optional | 3 hours |

Not sure? Start with Beginners. If you never code, start with Noobs.

## All labs by track

### Foundations

The four ideas every agent uses.

| Lab | What it teaches |
| --- | --- |
| 1. The agent loop | The model asks for a tool, code runs it, and the loop repeats until the model answers. |
| 2. Guardrails and PHI redaction | Hide private details before the model reads them, and block replies with no source. |
| 3. Human in the loop gates | Stop the run and ask a person when the system is unsure. |
| 4. Workflow, one agent, multi-agent | Three ways to build one helper, and when to pick each. |

### Tools and protocols

How an agent reaches tools: functions, the shell and MCP.

| Lab | What it teaches |
| --- | --- |
| 5. Tool schemas and structured output | Check the model's tool input against a schema, then repair or reject it. |
| 6. A shell tool, safely | Let an agent run commands with an allow-list, a fixed folder and a timeout. |
| 7. MCP basics | Discover and call tools from a real MCP server instead of hard-coding them. |
| 8. Trusting an MCP server | Pin tool schemas and allow-list servers, so a changed or hostile tool is caught. |
| 9. Function, CLI or MCP | Do the same job through three doors and compare them. |

### Context engineering

What the model reads, and how to choose it.

| Lab | What it teaches |
| --- | --- |
| 10. The context budget | Fit the prompt in the window by counting and ordering what goes in. |
| 11. Trimming long history | Keep the pinned facts and summarise the old turns. |
| 12. Retrieval | Find the right passages, cite them, and see where keyword search fails. |
| 13. Picking the right context | Choose documents by rule, so the wrong country or topic never reaches the model. |
| 14. Instructions versus data | Label untrusted text as data, so an email cannot give orders. |

### Loop engineering

How a loop ends well, and how it recovers.

| Lab | What it teaches |
| --- | --- |
| 15. Stop conditions | End a loop with a step cap, a done check and stuck-call detection. |
| 16. Error feedback and retries | Show the model its error and retry a set number of times. |
| 17. Plan, then act | Write the plan first and tick off each step. |
| 18. Reflect and fix | A critic checks the draft, the writer retries, then a person decides. |

### Agent runtime

The machine that runs the loop: state, failures, cost.

| Lab | What it teaches |
| --- | --- |
| 19. Run state | Keep a run record, so you can say what an agent is doing. |
| 20. When tools fail | Handle timeouts, bad input and flaky services. |
| 21. Crash and resume | Replay after a kill without doing any work twice. |
| 22. Budgets | Cap cost, time and handoffs, so a run cannot run away. |
| 23. Model routing and caching | Use a cheap model for easy jobs, a strong one for hard jobs, and cache repeats. |

### Harness engineering

The rules, checks and records around the model.

| Lab | What it teaches |
| --- | --- |
| 24. Identity and scopes | Give each bot its own identity and only the tools it needs. |
| 25. Acting for a user | Pass the user's rights along, so the bot never does more than they could. |
| 26. Hooks | Run checks in code before and after each tool call. |
| 27. Traces and the audit ledger | Record every step in a chain that shows any edit. |
| 28. Evals and the release gate | Block a release when a safety check fails. |

### Teammate patterns

How several agents work as one team.

| Lab | What it teaches |
| --- | --- |
| 29. Routing | Send each request to the right specialist. |
| 30. Chains and delegation | Split a big job into a chain, or give parts to workers. |
| 31. Parallel workers | Run workers side by side, then merge their results. |
| 32. Subagents with their own context | Keep noisy work out of the main context. |
| 33. Handoffs between agents | Pass work between bots with a hop limit that breaks loops. |
| 34. Memory the bots share | Share checked facts across bots, without letting a wrong fact in. |
| 35. Wakeups and the mission board | Wake agents on a schedule or an event, and show their work on a board. |

### HCP case study

The ideas used together on one real job.

| Lab | What it teaches |
| --- | --- |
| 36. One profile per doctor | Merge four systems into one profile and stop repeat outreach. |
| 37. The PHI vault | Swap private data for tokens that only a reviewer can reverse. |
| 38. The claim checker | Check every sentence of a draft against approved claims. |
| 39. Country rules and revocation | Block withdrawn documents, even from the cache. |
