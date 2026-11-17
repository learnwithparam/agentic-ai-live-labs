# Lab 38: check every sentence of a draft

Each example is an email draft that a person wrote. Give the draft with --draft, and the doctor's country with --country. Code checks each sentence against the approved documents.

## The problem

A draft can cite a real document and still say something that document never says. A model that reviews its own draft has no new facts.

## New words

claim = a sentence that says something about a drug. citation = the document id in brackets, such as [DOC-101]. word for word = the same words as the document.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/38-fact-checker.ts --demo
bun labs/38-fact-checker.ts --demo
bun labs/38-fact-checker.ts --demo
bun labs/38-fact-checker.ts --demo
bun labs/38-fact-checker.ts --demo
bun labs/38-fact-checker.ts --demo
```

Run `bun labs/38-fact-checker.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: ask the model if it is fine | The draft says Cardioza is safe for children. The document says nothing like that. The model has no new facts, so it says the draft is fine. | self-approved | `bun labs/38-fact-checker.ts --demo` |
| 2 | Every sentence is checked | The same draft goes to the claim checker. The sentence about children is not in DOC-101, so the email is blocked. | blocked | `bun labs/38-fact-checker.ts --demo` |
| 3 | A good draft | The dose sentence is word for word in DOC-101. The other two are plain talk. | sent | `bun labs/38-fact-checker.ts --demo` |
| 4 | EDGE: the wrong country | Dr. Weber is in Germany. DOC-101 is the US label, so its dose is not for him. | blocked | `bun labs/38-fact-checker.ts --demo` |
| 5 | EDGE: only the last sentence is bad | The first sentences are good. The last one is a new claim. It is found, and it is the only one named. | blocked | `bun labs/38-fact-checker.ts --demo` |

## The promise, and its test

Every sentence is checked. A claim needs a citation, a document for this country, and the document's own words. One bad sentence blocks the email.

```bash
bun test tests/promises/38.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Use a trained claim finder to catch claims that name no drug. Send each blocked sentence to a medical reviewer, and keep the result in the log.

## Read the code

Open `labs/38-fact-checker.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
