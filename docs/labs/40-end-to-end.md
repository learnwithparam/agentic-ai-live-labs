# Put it all together

Each example sends one doctor's note through every guard. A guard is one check that stops one risk. Pick the doctor with --hcp. Use --withdraw to pull a document first. Use --approve y or n to answer the gate.

## The story in one picture

```mermaid
flowchart LR
  A["Doctor's note"] --> B["Hide private details"]
  B --> C["Search approved sources"]
  C --> D["Model drafts a reply"]
  D --> E["Claim checker"]
  E --> F{"Every guard passed?"}
  F -->|"Yes"| G["Send and record it"]
  F -->|"No"| H["Hold for a person"]
```

## The problem

Each guard works alone. One missing guard is still a hole. A note can leak a patient, and a withdrawn dose can go out.

## New words

Each word has one meaning in every lab.

- **guard**: One check that stops one kind of risk.
- **record**: A log of every step, linked so that any edit shows.
- **gate**: A stop in the run where a person must say yes before it goes on.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab end-to-end --demo
bun run lab end-to-end --demo
bun run lab end-to-end --question "What is the dose of Cardioza for Dr. Lee?" --model nocite --approve y
bun run lab end-to-end --question "What is the dose of Cardioza for Dr. Lee?" --model nocite --approve n
bun run lab end-to-end --question "What is the dose of Cardioza for Dr. Lee?" --withdraw CARDIOZA-US
bun run lab end-to-end --question "What is the dose of Cardioza for Dr. Lee?" --hcp dr-unknown
bun run lab end-to-end --demo
```

Run `bun run lab end-to-end` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: no guards | The model reads the patient's name and number, and its reply goes out with no check. | sent-unchecked | `bun run lab end-to-end --demo` |
| 2 | Every guard passes | The private details are hidden, the reply matches CARDIOZA-US, and the record is whole. | sent | `bun run lab end-to-end --demo` |
| 3 | EDGE: a reply with no source, and a person says yes | The model forgets the citation, so the check fails. The person reads it and approves. | sent-after-approval | `bun run lab end-to-end --question "What is the dose of Cardioza for Dr. Lee?" --model nocite --approve y` |
| 4 | EDGE: a reply with no source, and a person says no | The same failure, and the person says no. Nothing is sent. | blocked | `bun run lab end-to-end --question "What is the dose of Cardioza for Dr. Lee?" --model nocite --approve n` |
| 5 | EDGE: the document was withdrawn | CARDIOZA-US is withdrawn, and no other approved document is left. The bot says it has no approved source. That is true, so it goes out. The old dose never does. | sent | `bun run lab end-to-end --question "What is the dose of Cardioza for Dr. Lee?" --withdraw CARDIOZA-US` |
| 6 | EDGE: a doctor we do not know | dr-unknown is not in the CRM, so the run stops at step 1. | refused | `bun run lab end-to-end --question "What is the dose of Cardioza for Dr. Lee?" --hcp dr-unknown` |

## Stuck points

**Correct run:** Send the note through every guard. Only a checked reply, or one a person approved, goes out.

**Common wrong turn:** Trusting one guard. Each guard works alone, so one missing guard is still a hole.

**Hint to give:** Which guard would stop this risk, and did it run?

| What you see | What it means | Fix |
| --- | --- | --- |
| The demo prints outcome: sent-unchecked on the NAIVE case | No guard ran before the send | Run every guard before the reply is sent |
| The reply is held for a person | A guard blocked it | Read which guard blocked it, then decide at the gate |
| The record shows an edit | A line in the record changed | Find the line with the edit, and restore it from the saved copy |

## The promise, and its test

Private details never reach the model. Only a checked reply goes out, or one a person approved. Every step is in a record that shows any edit.

```bash
bun test tests/promises/40.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Run each guard as its own service with its own owner. Alert a person when a guard blocks, and keep the record in storage that cannot be changed.

## Read the code

Open `labs/40-end-to-end.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
