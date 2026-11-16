# Lab 2: guardrails and private details

Each example is a note from a doctor. The input guardrail hides private details before the model reads the note. The output guardrail blocks any reply with no approved source.

## The problem

Once a model has read a patient's name or number, you cannot take it back. And a model can write a fact with no source.

## New words

PHI = private health details, like a name or a record number. token = a label such as [SSN] that stands in for a private piece. guardrail = a check in plain code, before or after the model.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/02-guardrails.ts --demo
bun labs/02-guardrails.ts --demo
bun labs/02-guardrails.ts --demo
bun labs/02-guardrails.ts --question "Cardioza dose"
bun labs/02-guardrails.ts --demo
bun labs/02-guardrails.ts --question "Jane Doe takes Cardioza, what is the dose?"
bun labs/02-guardrails.ts --question "Cardioza dose" --model nocite
bun labs/02-guardrails.ts --question "Zorbex dose"
bun labs/02-guardrails.ts --question "Cardioza dose" --model invent
bun labs/02-guardrails.ts --demo
```

Run `bun labs/02-guardrails.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: no guardrails | The model reads the patient's name and social security number. Its reply goes out with no check. Once a model has read private details, you cannot take them back. | leaked 3 | `bun labs/02-guardrails.ts --demo` |
| 2 | Name, social security number and phone | The classic case. All three are hidden, and the model only ever sees the tokens. | 3 masked, passed | `bun labs/02-guardrails.ts --demo` |
| 3 | Email, record number and birth date | Other formats the input guardrail knows about. | 3 masked, passed | `bun labs/02-guardrails.ts --demo` |
| 4 | Nothing private | A clean question passes through unchanged. No false alarms. | 0 masked, passed | `bun labs/02-guardrails.ts --question "Cardioza dose"` |
| 5 | EDGE: a number format we do not know | The SSN has no dashes, so our rule misses it and it stays in the note. This is the limit of rule-based hiding. Real systems add a trained detector and a review step. | 0 masked, passed | `bun labs/02-guardrails.ts --demo` |
| 6 | EDGE: a name with no label | We only catch names that follow 'Patient:'. A bare name goes straight through. | 0 masked, passed | `bun labs/02-guardrails.ts --question "Jane Doe takes Cardioza, what is the dose?"` |
| 7 | Reply with no citation | This model gives the right fact but forgets the source tag. The output guardrail blocks it anyway. An uncited claim never goes out. | 0 masked, blocked | `bun labs/02-guardrails.ts --question "Cardioza dose" --model nocite` |
| 8 | No approved source, so no citation | The model refuses, and a refusal has no citation either. The guardrail blocks it. In lab 3 that sends it to a person. | 0 masked, blocked | `bun labs/02-guardrails.ts --question "Zorbex dose"` |
| 9 | EDGE: wrong dose, valid citation | The model says 20mg and cites the real document. A citation check cannot see that the claim is wrong. Only a check of the claim itself can. That is lab 4. | 0 masked, passed | `bun labs/02-guardrails.ts --question "Cardioza dose" --model invent` |

## The promise, and its test

The model only ever reads the hidden version of a note. A reply with no approved source is blocked.

```bash
bun test tests/promises/02.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Rules catch only the formats you wrote. Add a trained detector and a person to review what it misses. Never log the raw note.

## Read the code

Open `labs/02-guardrails.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
