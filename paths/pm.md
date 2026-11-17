# Path: Product managers

**For:** You decide what ships and what is safe. You do not need to read code.

**Goal:** Ask the right questions of your team, and know what a good answer sounds like.

**Time:** 3.5 hours for the main steps, about a quick coffee a lab.

## How to work

- Run each lab with --demo. Do not read the code.
- Read the header of each lab: the challenge, the promise and what it becomes in production.
- Take the question in the last column into your next review.

## Do these

| Lab | Command | What to do |
| --- | --- | --- |
| The agent loop | `bun run lab agent-loop --demo` | Ask: what stops the loop when the model never finishes? |
| Guardrails and PHI redaction | `bun run lab guardrails --demo` | Ask: what private data could reach the model today? |
| Human in the loop gates | `bun run lab gates --demo` | Ask: which cases wait for a person, and who is that person? |
| Workflow, one agent, multi-agent | `bun run lab shapes --demo` | Ask: why did we pick this shape and not a simpler one? |
| Trusting an MCP server | `bun run lab mcp-trust --demo` | Ask: who approved each outside tool server, and what if its tools change? |
| Function, CLI or MCP | `bun run lab three-doors --demo` | Ask: which door do our tools use, and who checked it? |
| The context budget | `bun run lab context-budget --demo` | Ask: what goes in each prompt, and what happens when it is too long? |
| Budgets | `bun run lab budgets --demo` | Ask: what is the most one run can cost, and who gets the alert? |
| Traces and the audit ledger | `bun run lab traces-and-audit --demo` | Ask: can we show why the system sent a message, a month later? |
| Evals and the release gate | `bun run lab evals-and-release --demo` | Ask: what blocks a release when a safety check fails? |
| One profile per doctor | `bun run lab hcp-360 --demo` | Ask: do doctors get two emails about one product? |
| Country rules and revocation | `bun run lab revocation --demo` | Ask: how fast does a withdrawn document stop being used? |
| Put it all together | `bun run lab end-to-end --demo` | Ask: which guards did one answer pass, and can we see the record? |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| Acting for a user | `bun run lab act-for-user --demo` | Ask: can a bot do more than the person who asked? |
| Wakeups and the mission board | `bun run lab wakeups-and-board --demo` | Ask: which jobs run without being asked, and where can we see them? |

## When you finish

You can review an agent project, spot the missing control, and ask for the test that proves it.

Next: [Beginners](beginner.md).
