# Learning paths

Pick the path that matches you. Every path uses the same labs in a different order.

| Path | For | Time |
| --- | --- | --- |
| [Noobs](noob.md) | You have never built with AI, and you may not code. You want to know what an agent is. | 2 hours |
| [Beginners](beginner.md) | You can write simple code, such as functions and loops. Agents are new to you. | 6 hours |
| [Intermediate](intermediate.md) | You have called an LLM API inside an app. You want it to work reliably. | 11 hours |
| [Advanced](advanced.md) | You run agents in production, or you lead the team that does. | 10.5 hours |
| [Product managers](pm.md) | You decide what ships and what is safe. You do not need to read code. | 3.5 hours |

Not sure? Start with Beginners. If you never code, start with Noobs.

## All labs by track

### Foundations

The four ideas every agent uses.

| Lab | What it teaches |
| --- | --- |
| The agent loop | The model asks for a tool, code runs it, and the loop repeats until the model answers. |
| Guardrails and PHI redaction | Hide private details before the model reads them, and block replies with no source. |
| Human in the loop gates | Stop the run and ask a person when the system is unsure. |
| Workflow, one agent, multi-agent | Three ways to build one helper, and when to pick each. |

### Tools and protocols

How an agent reaches tools: functions, the shell and MCP.

| Lab | What it teaches |
| --- | --- |
| Tool schemas and structured output | Check the model's tool input against a schema, then repair or reject it. |
| A shell tool, safely | Let an agent run commands with an allow-list, a fixed folder and a timeout. |
| MCP basics | Discover and call tools from a real MCP server instead of hard-coding them. |
| Trusting an MCP server | Pin tool schemas and allow-list servers, so a changed or hostile tool is caught. |
| Function, CLI or MCP | Do the same job through three doors and compare them. |

### Context engineering

What the model reads, and how to choose it.

| Lab | What it teaches |
| --- | --- |
| The context budget | Fit the prompt in the window by counting and ordering what goes in. |
| Trimming long history | Keep the pinned facts and drop the old turns. |
| Retrieval | Find the right passages, cite them, and see where keyword search fails. |
| Picking the right context | Choose documents by rule, so the wrong country or topic never reaches the model. |
| Instructions versus data | Label untrusted text as data, so an email cannot give orders. |

### Loop engineering

How a loop ends well, and how it recovers.

| Lab | What it teaches |
| --- | --- |
| Stop conditions | End a loop with a step cap, a done check and stuck-call detection. |
| Error feedback and retries | Show the model its error and retry a set number of times. |
| Plan, then act | Write the plan first and tick off each step. |
| Reflect and fix | A critic checks the draft, the writer retries, then a person decides. |

### Agent runtime

The machine that runs the loop: state, failures, cost.

| Lab | What it teaches |
| --- | --- |
| Run state | Keep a run record, so you can say what an agent is doing. |
| When tools fail | Handle timeouts, bad input and flaky services. |
| Crash and resume | Replay after a kill without doing any work twice. |
| Budgets | Cap cost, time and handoffs, so a run cannot run away. |
| Model routing and caching | Use a cheap model for easy jobs, a strong one for hard jobs, and cache repeats. |

### Harness engineering

The rules, checks and records around the model.

| Lab | What it teaches |
| --- | --- |
| Identity and scopes | Give each bot its own identity and only the tools it needs. |
| Acting for a user | Pass the user's rights along, so the bot never does more than they could. |
| Hooks | Run checks in code before and after each tool call. |
| Traces and the audit ledger | Record every step in a chain that shows any edit. |
| Evals and the release gate | Block a release when a safety check fails. |

### Teammate patterns

How several agents work as one team.

| Lab | What it teaches |
| --- | --- |
| Routing | Send each request to the right specialist. |
| Chains and delegation | Split a big job into a chain, or give parts to workers. |
| Parallel workers | Run workers side by side, then merge their results. |
| Subagents with their own context | Keep noisy work out of the main context. |
| Handoffs between agents | Pass work between bots with a hop limit that breaks loops. |
| Memory the bots share | Share checked facts across bots, without letting a wrong fact in. |
| Wakeups and the mission board | Wake agents on a schedule or an event, and show their work on a board. |

### HCP case study

The ideas used together on one real job.

| Lab | What it teaches |
| --- | --- |
| One profile per doctor | Merge four systems into one profile and stop repeat outreach. |
| The PHI vault | Swap private data for tokens that only a reviewer can reverse. |
| The claim checker | Check every sentence of a draft against approved claims. |
| Country rules and revocation | Block withdrawn documents, even from the cache. |
| Put it all together | Send one note through every guard, and keep a record nobody can edit. |
