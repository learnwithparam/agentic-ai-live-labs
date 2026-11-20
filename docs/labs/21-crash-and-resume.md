# Crash and resume

Each example sends a follow-up to 40 quiet leads. Some send a SIGKILL at lead 17, which stops the program at once. Pick one with --scenario: naive, clean, resume, between or done. Each finished step is written in the ledger.

## The story in one picture

```mermaid
flowchart LR
  A["Job: 40 follow-up emails"] --> B["Send one email"]
  B --> C["Write it in the ledger"]
  C -->|"crash here"| D["Restart"]
  D --> E["Read the ledger"]
  E --> F["Skip what was sent"]
  F --> G["Finish the rest"]
```

## The problem

A kill in the middle of a job loses work or does it twice. Start again from the top, and the first 17 leads get the same email twice.

## New words

Each word has one meaning in every lab.

- **ledger**: A file on disk that lists each step already finished.
- **idempotency key**: A unique name for one action, so it happens once, even if asked twice.
- **resume**: Start again from the ledger and carry on, not from the beginning.
- **SIGKILL**: A signal that stops a program at once. The program cannot catch it or clean up.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario naive
bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario clean
bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario resume
bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario between
bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario done
bun run lab crash-and-resume --demo
```

Run `bun run lab crash-and-resume` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: start over after a kill | The program dies after it emails lead 17. The restart begins at the top. The first 17 leads get a second email. | duplicates | `bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario naive` |
| 2 | No crash | All 40 leads get one email, and the ledger lists all 40. | ok | `bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario clean` |
| 3 | A kill, then a restart | The program dies after the ledger holds lead 17. The restart skips 17 leads and emails the other 23. | ok | `bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario resume` |
| 4 | EDGE: a kill between the send and the ledger | The email went out but the ledger line was not written. The restart tries lead 17 again, and the outbox refuses the key. | ok | `bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario between` |
| 5 | EDGE: run a finished job again | Every lead is in the ledger. The second run does nothing at all. | ok | `bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario done` |

## Stuck points

**Correct run:** Record each finished step in the ledger. After a kill, restart from the ledger and skip what was sent.

**Common wrong turn:** Starting again from the top. The first leads get the same email twice.

**Hint to give:** Where does the program record what it already did?

| What you see | What it means | Fix |
| --- | --- | --- |
| The demo prints outcome: duplicates on the NAIVE case | Leads got the email twice after a restart | Read the ledger before each send |
| A send carries an idempotency key | The key stops the same send twice | Keep each key, and never change it |
| The job finishes but sends again | The ledger line was not written | Write the ledger line right after each send |

## The promise, and its test

After a kill and a restart, every lead has exactly one email. A step in the ledger is never done again. An idempotency key stops a send from happening twice.

```bash
bun test tests/promises/21.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

A real agent saves its progress after every step, in a database. Then any worker can pick the job up again. Ask your email service to honour the idempotency key. Then a crash between our two writes is still safe.

## Read the code

Open `labs/21-crash-and-resume.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
