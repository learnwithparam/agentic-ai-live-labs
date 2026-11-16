# Lab 14: instructions versus data

Each example is a document the agent reads. Pick one by name: clean, injected, breakout or subtle. Three of them hide an order.

## The problem

The model reads rules and documents as one text. A document can give it orders, and nobody notices.

## New words

prompt injection = an order hidden in data. fence = a labelled box that marks text as data. held = taken out of the prompt.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/14-instructions-vs-data.ts --question "injected" --naive
bun labs/14-instructions-vs-data.ts --question "clean"
bun labs/14-instructions-vs-data.ts --question "injected"
bun labs/14-instructions-vs-data.ts --question "breakout"
bun labs/14-instructions-vs-data.ts --question "subtle"
bun labs/14-instructions-vs-data.ts --demo
```

Run `bun labs/14-instructions-vs-data.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: paste the data in | The hidden order sits next to the rules and looks the same. The model may obey it. | obeyed | `bun labs/14-instructions-vs-data.ts --question "injected" --naive` |
| 2 | A clean document | No order in it. The data is fenced and nothing is held. | clean | `bun labs/14-instructions-vs-data.ts --question "clean"` |
| 3 | A document with an order | The order line is held back. The facts stay, and the agent still answers. | held | `bun labs/14-instructions-vs-data.ts --question "injected"` |
| 4 | A document that tries to close the fence | It writes a closing tag, then new rules. We turn the tag into harmless text, so the new rules stay inside the data. | fenced | `bun labs/14-instructions-vs-data.ts --question "breakout"` |
| 5 | EDGE: an order with no order words | No word on our list appears, so the scan sees nothing. This is the limit of a word list. Lab 3's gate and lab 24's scopes are the next defence. | slipped | `bun labs/14-instructions-vs-data.ts --question "subtle"` |

## The promise, and its test

A line with an order never reaches the prompt, and data can never close its own fence.

```bash
bun test tests/promises/14.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Fence and scan as here, and also give the agent the fewest tools, with a person approving risky ones (lab 3).

## Read the code

Open `labs/14-instructions-vs-data.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You can skip it.
