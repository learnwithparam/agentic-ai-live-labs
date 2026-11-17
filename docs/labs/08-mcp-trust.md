# Lab 8: trusting an MCP server

Each example is a server and the tools it lists. Only the server hcp-docs is approved, and its tools were pinned when a person reviewed them. Pick a scene by typing its name.

## The problem

A tool description goes into the prompt. A server can change it later and give the model orders.

## New words

pin = remember what a tool looked like when approved. rug pull = a tool changes after approval. fingerprint = a short code for a text.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server unknown-server --naive
bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server approved
bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server unknown-server
bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server rug-pull
bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server new-tool
bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server typo-fix
bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server bad-but-pinned
bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server re-approved --reapprove
bun labs/08-mcp-trust.ts --demo
```

Run `bun labs/08-mcp-trust.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: trust every description | The server hides an order inside a tool description. With no check, the order goes straight into the prompt, and the model may follow it. | poisoned | `bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server unknown-server --naive` |
| 2 | An approved server, unchanged | Right server, and both tools match their pins. Both are loaded. | trusted | `bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server approved` |
| 3 | A server nobody approved | The name is not on the list. We do not even read its tools. | blocked | `bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server unknown-server` |
| 4 | A rug pull | The server was approved, then one tool quietly gained a hidden order. Its fingerprint no longer matches the pin, so it is held back. | changed | `bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server rug-pull` |
| 5 | A new tool appears | A tool that can send email shows up. Nobody reviewed it, so it is not loaded. The old tools still work. | new | `bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server new-tool` |
| 6 | A harmless fix is also held | Even a one word fix changes the fingerprint. We are strict on purpose. Re-approving takes one step. | changed | `bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server typo-fix` |
| 7 | EDGE: an order that was approved by mistake | A person pinned a tool that already held an order. The word scan still catches it. It is a rule list, so a cleverer order could slip past. That is why a person reviews too. | trap | `bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server bad-but-pinned` |
| 8 | A person re-approves | After a review the new text is pinned. The tool is trusted again. | trusted | `bun labs/08-mcp-trust.ts --question "What is the dose of Cardioza?" --server re-approved --reapprove` |

## The promise, and its test

A tool that is unapproved, new, changed or carrying an order is never loaded.

```bash
bun test tests/promises/08.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Pin on a schedule, alert on any change, and let only a named person re-approve a tool.

## Read the code

Open `labs/08-mcp-trust.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
