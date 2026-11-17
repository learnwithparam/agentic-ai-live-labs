# Lab 18: check the draft, then fix it

Each example is a doctor's question. The pretend model writes a draft, and sometimes the draft is wrong. Pick how it acts with --model. Use ok, nocite (no citation), invent (a wrong dose) or stubborn (a wrong dose it will not fix).

## The problem

A model that grades its own work has no new facts. It says the draft looks good, even when the dose is wrong.

## New words

draft = the first answer. check = plain code that compares the draft with the document. round = one fix and one more check.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model invent --naive
bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?"
bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model nocite
bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model invent
bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model stubborn
bun labs/18-reflect-and-fix.ts --question "Is Zorbex safe for children?"
bun labs/18-reflect-and-fix.ts --demo
```

Run `bun labs/18-reflect-and-fix.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: ask the model if it is fine | The model writes 20mg. The document says 10mg. We ask the model if the draft is fine. It has no new facts, so it says yes. | self-approved | `bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model invent --naive` |
| 2 | A good draft | It cites the document and the dose matches. No fix is needed. | accepted | `bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?"` |
| 3 | A missing citation | The check finds no citation. The model adds one, and the second check passes. | fixed | `bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model nocite` |
| 4 | A wrong dose | The check finds 20mg is not in the document. The model changes it to 10mg. | fixed | `bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model invent` |
| 5 | EDGE: a model that will not change | The model sends the same wrong draft twice. After two rounds we stop and give it to a person. | gave-up | `bun labs/18-reflect-and-fix.ts --question "What is the dose of Cardioza?" --model stubborn` |
| 6 | No approved document | Zorbex has no approved document. With nothing to check against, there is no answer to give. | no-source | `bun labs/18-reflect-and-fix.ts --question "Is Zorbex safe for children?"` |

## The promise, and its test

Code checks every draft against the source. A fix gets two rounds at most. With no source there is nothing to check.

```bash
bun test tests/promises/18.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Check what code can check, like numbers and citations. Send the rest to a person, and keep every round in the log.

## Read the code

Open `labs/18-reflect-and-fix.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
