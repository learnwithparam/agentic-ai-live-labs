# Lab 2: guardrails and PHI redaction

Two guardrails wrap the model. The input guardrail hides personal and patient details on our side, before any model sees the note. The output guardrail refuses a reply that has no approved citation.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
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

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | Name, social security number and phone | The classic case. All three are hidden, and the model only ever sees the tokens. | 3 masked, passed | `bun labs/02-guardrails.ts --demo` |
| 2 | Email, record number and birth date | Other formats the input guardrail knows about. | 3 masked, passed | `bun labs/02-guardrails.ts --demo` |
| 3 | Nothing private | A clean question passes through unchanged. No false alarms. | 0 masked, passed | `bun labs/02-guardrails.ts --question "Cardioza dose"` |
| 4 | EDGE: a number format we do not know | The SSN has no dashes, so our rule misses it and it stays in the note. This is the limit of rule-based hiding. Real systems add a trained detector and a review step. | 0 masked, passed | `bun labs/02-guardrails.ts --demo` |
| 5 | EDGE: a name with no label | We only catch names that follow 'Patient:'. A bare name goes straight through. | 0 masked, passed | `bun labs/02-guardrails.ts --question "Jane Doe takes Cardioza, what is the dose?"` |
| 6 | Reply with no citation | This model gives the right fact but forgets the source tag. The output guardrail blocks it anyway. An uncited claim never goes out. | 0 masked, blocked | `bun labs/02-guardrails.ts --question "Cardioza dose" --model nocite` |
| 7 | No approved source, so no citation | The model refuses, and a refusal has no citation either. The guardrail blocks it. In lab 3 that sends it to a person. | 0 masked, blocked | `bun labs/02-guardrails.ts --question "Zorbex dose"` |
| 8 | EDGE: wrong dose, valid citation | The model says 20mg and cites the real document. A citation check cannot see that the claim is wrong. Only a check of the claim itself can. That is lab 4. | 0 masked, passed | `bun labs/02-guardrails.ts --question "Cardioza dose" --model invent` |

## Read the code

Open `labs/02-guardrails.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You can skip it.
