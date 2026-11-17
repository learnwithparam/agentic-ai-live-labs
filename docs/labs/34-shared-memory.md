# Lab 34: memory the bots share

Each example has two bots ask for a dose, one after the other. The first bot may use a model that makes up a dose, with --model invent. Pick the first doctor with --hcp and the second with --then.

## The problem

One bot saves a wrong dose. Every bot after it reads the fact and repeats it. No one looks at the approved document again.

## New words

shared memory = facts that every bot can read. poisoned = a wrong fact that got in. provenance = who saved a fact, and from which source.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --model invent --naive
bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1
bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --model invent
bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Weber?" --hcp H-1 --then H-2
bun labs/34-shared-memory.ts --question "What is the dose of Zorbex for Dr. Lee?" --hcp H-1
bun labs/34-shared-memory.ts --demo
```

Run `bun labs/34-shared-memory.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: save whatever a bot says | The first bot makes up a dose and it is saved. The second bot reads it and repeats it. | poisoned | `bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --model invent --naive` |
| 2 | The second bot reuses a checked fact | The first bot saves a checked dose. The second bot reads it from memory. | shared | `bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1` |
| 3 | EDGE: a made-up dose is not saved | The first bot makes up a dose. The check refuses to save it, so the second bot finds the real one. | clean | `bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --model invent` |
| 4 | EDGE: a fact for another country | Dr. Lee is in the US and Dr. Weber is in Germany. The US fact is not used for Dr. Weber. | clean | `bun labs/34-shared-memory.ts --question "What is the dose of Cardioza for Dr. Weber?" --hcp H-1 --then H-2` |
| 5 | EDGE: no approved document | There is no approved document for Zorbex. Nothing is saved, and the second bot says so too. | no-answer | `bun labs/34-shared-memory.ts --question "What is the dose of Zorbex for Dr. Lee?" --hcp H-1` |

## The promise, and its test

A fact is saved only if it passes the dose check. A bot reads only facts for its own country, and only while the approved document still agrees.

```bash
bun test tests/promises/34.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Keep memory in a database with the writer and the source on every row. Give facts an end date. Let a person delete a fact, and log every read.

## Read the code

Open `labs/34-shared-memory.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
