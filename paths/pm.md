# Path: Product managers

**For:** You decide what ships and what is safe. You do not need to read code.

**Goal:** Ask the right questions of your team, and know what a good answer sounds like.

**Time:** 3 hours for the main steps, about a quick coffee a lab.

## How to work

- Run each lab with --demo. Do not read the code.
- Read the header of each lab: the challenge, the promise and what it becomes in production.
- Take the question in the last column into your next review.

## Do these

| Lab | Command | What to do |
| --- | --- | --- |
| 1. The agent loop | `bun run lab 1 --demo` | Ask: what stops the loop when the model never finishes? |
| 2. Guardrails and PHI redaction | `bun run lab 2 --demo` | Ask: what private data could reach the model today? |
| 3. Human in the loop gates | `bun run lab 3 --demo` | Ask: which cases wait for a person, and who is that person? |
| 4. Workflow, one agent, multi-agent | `bun run lab 4 --demo` | Ask: why did we pick this shape and not a simpler one? |
| 8. Trusting an MCP server | `bun run lab 8 --demo` | Ask: who approved each outside tool server, and what if its tools change? |
| 9. Function, CLI or MCP | `bun run lab 9 --demo` | Ask: which door do our tools use, and who checked it? |
| 10. The context budget | `bun run lab 10 --demo` | Ask: what goes in each prompt, and what happens when it is too long? |
| 22. Budgets | `bun run lab 22 --demo` | Ask: what is the most one run can cost, and who gets the alert? |
| 27. Traces and the audit ledger | `bun run lab 27 --demo` | Ask: can we show why the system sent a message, a month later? |
| 28. Evals and the release gate | `bun run lab 28 --demo` | Ask: what blocks a release when a safety check fails? |
| 36. One profile per doctor | `bun run lab 36 --demo` | Ask: do doctors get two emails about one product? |
| 39. Country rules and revocation | `bun run lab 39 --demo` | Ask: how fast does a withdrawn document stop being used? |

## Optional

| Lab | Command | What to do |
| --- | --- | --- |
| 25. Acting for a user | `bun run lab 25 --demo` | Ask: can a bot do more than the person who asked? |
| 35. Wakeups and the mission board | `bun run lab 35 --demo` | Ask: which jobs run without being asked, and where can we see them? |

## When you finish

You can review an agent project, spot the missing control, and ask for the test that proves it.

Next: [Beginners](beginner.md).
