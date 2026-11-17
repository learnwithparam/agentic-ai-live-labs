# Lab 3: human in the loop gates

A gate stops the run and hands the full story to a person. Gate 1 fires before the model runs, when there is no approved document. Gate 2 fires after, when the reply fails the output check. Add --approve y or --approve n to answer the gate. With no answer, the gate says no.

## The problem

A model always writes something. With no gate, a reply with no source goes straight to a doctor.

## New words

gate = a stop in the run where a person must say yes. human in the loop = a person who decides before anything goes out. escalate = send it to a person.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/03-gates.ts --question "What is the dose of Cardioza?" --model nocite --naive
bun labs/03-gates.ts --question "What is the dose of Cardioza?"
bun labs/03-gates.ts --question "What is the dose of Zorbex?" --approve y
bun labs/03-gates.ts --question "What is the dose of Zorbex?" --approve n
bun labs/03-gates.ts --question "What is the dose of Cardioza?" --model nocite --approve y
bun labs/03-gates.ts --question "What is the dose of Cardioza?" --model nocite --approve n
bun labs/03-gates.ts --demo
bun labs/03-gates.ts --question "What is the dose of Dermalin?" --country DE --approve n
bun labs/03-gates.ts --question "hello there" --approve n
bun labs/03-gates.ts --demo
```

Run `bun labs/03-gates.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: no gate | The model forgets the citation. With no gate, the uncited reply goes straight to the doctor. | SENT_UNCHECKED | `bun labs/03-gates.ts --question "What is the dose of Cardioza?" --model nocite --naive` |
| 2 | No gate needed | Approved document found, reply cited. Nothing to stop, so it is sent. | SENT | `bun labs/03-gates.ts --question "What is the dose of Cardioza?"` |
| 3 | Gate 1, reviewer approves | No approved document, so the model is never called. A person sees the fallback message and approves it. | SENT_AFTER_HUMAN_APPROVAL | `bun labs/03-gates.ts --question "What is the dose of Zorbex?" --approve y` |
| 4 | Gate 1, reviewer rejects | Same stop, but the person says no. Nothing is sent. | BLOCKED_BY_REVIEWER | `bun labs/03-gates.ts --question "What is the dose of Zorbex?" --approve n` |
| 5 | Gate 2, reviewer approves | The model forgot the citation. The output check stops it and a person reads the draft before it can go. | SENT_AFTER_HUMAN_APPROVAL | `bun labs/03-gates.ts --question "What is the dose of Cardioza?" --model nocite --approve y` |
| 6 | Gate 2, reviewer rejects | Same stop, and the person rejects it. | BLOCKED_BY_REVIEWER | `bun labs/03-gates.ts --question "What is the dose of Cardioza?" --model nocite --approve n` |
| 7 | Patient details in the question | The note is masked before the search, so the reply and the reviewer never see the SSN or the name. | SENT | `bun labs/03-gates.ts --demo` |
| 8 | Approved in another country only | Dermalin is approved in the US only. A German doctor hits gate 1. | BLOCKED_BY_REVIEWER | `bun labs/03-gates.ts --question "What is the dose of Dermalin?" --country DE --approve n` |
| 9 | Small talk | No drug, no document. The safe default is to stop and ask a person. | BLOCKED_BY_REVIEWER | `bun labs/03-gates.ts --question "hello there" --approve n` |

## The promise, and its test

With no approved document, or a reply with no source, nothing goes out until a person says yes. No answer means no.

```bash
bun test tests/promises/03.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Send the gate to a real queue with a name, a time and a reason. Log who approved what. Keep the default as no.

## Read the code

Open `labs/03-gates.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
