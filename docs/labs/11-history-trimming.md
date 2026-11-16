# Lab 11: trimming the chat history

Each example is a chat between a doctor and the agent, and the last question needs a fact from the start. Pick a chat by name: short, long, two-facts, no-facts or empty. Use --keep 4 to change how many recent turns stay.

## The problem

A long chat does not fit. Cutting the oldest turns also cuts early facts, like the doctor's country.

## New words

history = the earlier turns of a chat. trim = leave out old turns. pinned fact = a turn we keep whatever its age.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/11-history-trimming.ts --question "long" --naive --keep 4
bun labs/11-history-trimming.ts --question "short" --keep 4
bun labs/11-history-trimming.ts --question "long" --keep 4
bun labs/11-history-trimming.ts --question "two-facts" --keep 3
bun labs/11-history-trimming.ts --question "long" --keep 0
bun labs/11-history-trimming.ts --question "no-facts" --keep 4
bun labs/11-history-trimming.ts --question "long" --keep 50
bun labs/11-history-trimming.ts --question "empty" --keep 4
bun labs/11-history-trimming.ts --demo
```

Run `bun labs/11-history-trimming.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: keep only the last turns | The doctor said Germany in the first turn. That turn is old, so it is cut. The agent no longer knows which label to use. | fact-lost | `bun labs/11-history-trimming.ts --question "long" --naive --keep 4` |
| 2 | A short chat | The chat is shorter than the limit, so nothing is cut. | nothing-to-trim | `bun labs/11-history-trimming.ts --question "short" --keep 4` |
| 3 | A long chat, fact pinned | The old chatter is cut. The country turn stays, because it is pinned. | trimmed | `bun labs/11-history-trimming.ts --question "long" --keep 4` |
| 4 | Two pinned facts | Two old facts are pinned, one early and one in the middle. Both stay. | trimmed | `bun labs/11-history-trimming.ts --question "two-facts" --keep 3` |
| 5 | Facts only | We keep zero recent turns. Only the pinned facts remain. The current question is sent on its own, as in lab 10. | facts-only | `bun labs/11-history-trimming.ts --question "long" --keep 0` |
| 6 | A chat with no facts | Nothing is pinned, so only the last turns stay. This is safe, because nothing there was needed. | trimmed | `bun labs/11-history-trimming.ts --question "no-facts" --keep 4` |
| 7 | A limit larger than the chat | We allow 50 recent turns, and the chat has fewer. Nothing is cut. | nothing-to-trim | `bun labs/11-history-trimming.ts --question "long" --keep 50` |
| 8 | An empty chat | A new chat has no history. There is nothing to trim, and nothing breaks. | empty | `bun labs/11-history-trimming.ts --question "empty" --keep 4` |

## The promise, and its test

Pinned facts and the most recent turns always survive, in order. Nothing else does.

```bash
bun test tests/promises/11.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Let the agent save facts with a tool, and write a short summary of the turns left out.

## Read the code

Open `labs/11-history-trimming.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
