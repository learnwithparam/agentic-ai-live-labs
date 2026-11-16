# Lab 18: check the draft, then fix it

Each example is a first draft written by a pretend model. Pick one by name: good, no-citation, wrong-dose, two-problems, stubborn or no-source. The code checks the draft against the approved document.

## The problem

A model that grades its own work has no new facts. It says the draft looks good, even when the dose is wrong.

## New words

draft = the first answer. check = code that compares the draft with the document. round = one fix and one more check.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/18-reflect-and-fix.ts --question "wrong-dose" --naive
bun labs/18-reflect-and-fix.ts --question "good"
bun labs/18-reflect-and-fix.ts --question "no-citation"
bun labs/18-reflect-and-fix.ts --question "wrong-dose"
bun labs/18-reflect-and-fix.ts --question "two-problems"
bun labs/18-reflect-and-fix.ts --question "stubborn"
bun labs/18-reflect-and-fix.ts --question "no-source"
bun labs/18-reflect-and-fix.ts --demo
```

Run `bun labs/18-reflect-and-fix.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: ask the model if it is fine | The draft says 20mg. The document says 10mg. The model has no new facts, so it says the draft looks good. | self-approved | `bun labs/18-reflect-and-fix.ts --question "wrong-dose" --naive` |
| 2 | A good draft | It cites the document and the dose matches. No fix is needed. | accepted | `bun labs/18-reflect-and-fix.ts --question "good"` |
| 3 | A missing citation | The check finds no citation. The model adds one, and the second check passes. | fixed | `bun labs/18-reflect-and-fix.ts --question "no-citation"` |
| 4 | A wrong dose | The check finds 20mg is not in the document. The model changes it to 10mg. | fixed | `bun labs/18-reflect-and-fix.ts --question "wrong-dose"` |
| 5 | EDGE: two problems at once | Both problems are listed together. One round fixes both. | fixed | `bun labs/18-reflect-and-fix.ts --question "two-problems"` |
| 6 | EDGE: a model that will not change | The model sends the same draft twice. After two rounds we stop and give it to a person. | gave-up | `bun labs/18-reflect-and-fix.ts --question "stubborn"` |
| 7 | No approved document | Dermalin has no German document. With nothing to check against, there is no answer to give. | no-source | `bun labs/18-reflect-and-fix.ts --question "no-source"` |

## The promise, and its test

Code checks every draft against the source. A fix gets two rounds at most. With no source there is nothing to check.

```bash
bun test tests/promises/18.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Check what code can check, like numbers and citations. Send the rest to a person, and keep every round in the log.

## Read the code

Open `labs/18-reflect-and-fix.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
