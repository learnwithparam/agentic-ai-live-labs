# Lab 3: human in the loop gates

A gate stops the run and hands the full trace to a person. Gate 1 fires before the model runs, when there is no approved document. Gate 2 fires after, when the reply fails the output check. Add --approve y or --approve n to answer a gate without typing.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/03-gates.ts --question "Cardioza dose"
bun labs/03-gates.ts --question "Zorbex dose" --approve y
bun labs/03-gates.ts --question "Zorbex dose" --approve n
bun labs/03-gates.ts --question "Cardioza dose" --model nocite --approve y
bun labs/03-gates.ts --question "Cardioza dose" --model nocite --approve n
bun labs/03-gates.ts --demo
bun labs/03-gates.ts --question "Dermalin dose" --country DE --approve n
bun labs/03-gates.ts --question "hello there" --approve n
bun labs/03-gates.ts --demo
```

Run `bun labs/03-gates.ts` with nothing else to pick an example from a menu.

## The cases

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | No gate needed | Approved document found, reply cited. Nothing to stop, so it is sent. | SENT | `bun labs/03-gates.ts --question "Cardioza dose"` |
| 2 | Gate 1, reviewer approves | No approved document, so the model is never called. A person sees the fallback message and approves it. | SENT_AFTER_HUMAN_APPROVAL | `bun labs/03-gates.ts --question "Zorbex dose" --approve y` |
| 3 | Gate 1, reviewer rejects | Same stop, but the person says no. Nothing is sent. | BLOCKED_BY_REVIEWER | `bun labs/03-gates.ts --question "Zorbex dose" --approve n` |
| 4 | Gate 2, reviewer approves | The model forgot the citation. The output check stops it and a person reads the draft before it can go. | SENT_AFTER_HUMAN_APPROVAL | `bun labs/03-gates.ts --question "Cardioza dose" --model nocite --approve y` |
| 5 | Gate 2, reviewer rejects | Same stop, and the person rejects it. | BLOCKED_BY_REVIEWER | `bun labs/03-gates.ts --question "Cardioza dose" --model nocite --approve n` |
| 6 | Patient details in the question | The note is masked before the search, so the reply and the reviewer never see the SSN or the name. | SENT | `bun labs/03-gates.ts --demo` |
| 7 | Approved in another country only | Dermalin is approved in the US only. A German doctor hits gate 1. | BLOCKED_BY_REVIEWER | `bun labs/03-gates.ts --question "Dermalin dose" --country DE --approve n` |
| 8 | Small talk | No drug, no document. The safe default is to stop and ask a person. | BLOCKED_BY_REVIEWER | `bun labs/03-gates.ts --question "hello there" --approve n` |

## Read the code

Open `labs/03-gates.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
