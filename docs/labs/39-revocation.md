# Lab 39: withdrawn documents and the cache

Each example asks one question twice. In between, a document may be withdrawn. Use --withdraw to withdraw it after the first answer. Use --late to withdraw it while the second answer is made.

## The problem

A saved answer is fast, and it never looks at the document again. When the document is withdrawn, the old dose still goes out.

## New words

withdrawn = the company took the document back. cache = saved answers, so the next ask is fast. revoke = make a saved answer stop working.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?" --withdraw DOC-101 --naive
bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?" --withdraw DOC-101
bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?" --withdraw DOC-102
bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?"
bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?" --late DOC-101
bun labs/39-revocation.ts --demo
```

Run `bun labs/39-revocation.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: serve the saved answer | DOC-101 is withdrawn after the first answer. The saved answer still holds its dose, and it goes out again. | stale | `bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?" --withdraw DOC-101 --naive` |
| 2 | A withdrawn document | The saved answer cites DOC-101. It is deleted. Nothing else is approved for Cardioza in the US, so there is no answer. | no-answer | `bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?" --withdraw DOC-101` |
| 3 | Another country's document | DOC-102 is for Germany. It is withdrawn, but Dr. Lee is in the US, so the saved answer is still good. | cache | `bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?" --withdraw DOC-102` |
| 4 | Nothing withdrawn | The second ask is served from the saved answer. It is fast, and it is still approved. | cache | `bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?"` |
| 5 | EDGE: withdrawn during the run | There is no saved answer. The document is withdrawn after the search and before the send. The last check catches it. | blocked | `bun labs/39-revocation.ts --question "What is the dose of Cardioza for Dr. Lee?" --late DOC-101` |

## The promise, and its test

A withdrawn document is never sent. That holds for a saved answer, and for an answer made a moment before. A US answer never reaches a German doctor.

```bash
bun test tests/promises/39.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Keep the withdrawal list in the same store as the documents, and have the document system call it. Alert the medical team when a saved answer is dropped.

## Read the code

Open `labs/39-revocation.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
