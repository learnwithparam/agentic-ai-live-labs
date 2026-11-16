# Lab 3: human in the loop gates

A gate stops the run and hands the full trace to a person. Gate 1 fires before the model runs, when there is no approved document. Gate 2 fires after, when the reply fails the output check. Add --approve y or --approve n to answer a gate without typing.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab 3 --question "Cardioza dose"
bun run lab 3 --question "Zorbex dose" --approve y
bun run lab 3 --question "Zorbex dose" --approve n
bun run lab 3 --question "Cardioza dose" --model nocite --approve y
bun run lab 3 --question "Cardioza dose" --model nocite --approve n
bun run lab 3 --demo
bun run lab 3 --question "Dermalin dose" --country DE --approve n
bun run lab 3 --question "hello there" --approve n
bun run lab 3 --demo
```

Run `bun run lab 3` with nothing else to pick an example from a menu.

## The cases

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | No gate needed | Approved document found, reply cited. Nothing to stop, so it is sent. | SENT | `bun run lab 3 --question "Cardioza dose"` |
| 2 | Gate 1, reviewer approves | No approved document, so the model is never called. A person sees the fallback message and approves it. | SENT_AFTER_HUMAN_APPROVAL | `bun run lab 3 --question "Zorbex dose" --approve y` |
| 3 | Gate 1, reviewer rejects | Same stop, but the person says no. Nothing is sent. | BLOCKED_BY_REVIEWER | `bun run lab 3 --question "Zorbex dose" --approve n` |
| 4 | Gate 2, reviewer approves | The model forgot the citation. The output check stops it and a person reads the draft before it can go. | SENT_AFTER_HUMAN_APPROVAL | `bun run lab 3 --question "Cardioza dose" --model nocite --approve y` |
| 5 | Gate 2, reviewer rejects | Same stop, and the person rejects it. | BLOCKED_BY_REVIEWER | `bun run lab 3 --question "Cardioza dose" --model nocite --approve n` |
| 6 | Patient details in the question | The note is masked before the search, so the reply and the reviewer never see the SSN or the name. | SENT | `bun run lab 3 --demo` |
| 7 | Approved in another country only | Dermalin is approved in the US only. A German doctor hits gate 1. | BLOCKED_BY_REVIEWER | `bun run lab 3 --question "Dermalin dose" --country DE --approve n` |
| 8 | Small talk | No drug, no document. The safe default is to stop and ask a person. | BLOCKED_BY_REVIEWER | `bun run lab 3 --question "hello there" --approve n` |

## Read the code

Open `labs/03-gates.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
