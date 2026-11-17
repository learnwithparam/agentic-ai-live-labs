# Act for the user

Each example is one doctor asking the bot a question. Pick the doctor with --hcp: H-1 is Dr. Lee in the US, H-2 is Dr. Weber in Germany. The bot carries a token that names her, and the search uses her country.

## The story in one picture

```mermaid
flowchart LR
  A["Doctor asks the bot"] --> B["Bot gets the doctor's rights"]
  B --> C{"Doctor may see this?"}
  C -->|"Yes"| D["Bot runs the search"]
  C -->|"No"| E["Bot refuses, even if asked"]
```

## The problem

A bot on its own key answers as typed. A German doctor who asks about the US label gets the US dose, which is wrong for her.

## New words

act for = do a job as a named person. delegation = a person lets a bot act for her. service key = one shared key with no person on it.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab act-for-user --question "What is the Cardioza dose in the US?" --hcp H-2 --naive
bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-1
bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-2
bun run lab act-for-user --question "What is the Cardioza dose in the US?" --hcp H-2
bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-9
bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-2 --forge
bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-1 --bot report
bun run lab act-for-user --demo
```

Run `bun run lab act-for-user` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: the bot's own key | Dr. Weber is in Germany and asks about the US. The service key searches the US, so she gets 10mg, the wrong label for her. | wrong-label | `bun run lab act-for-user --question "What is the Cardioza dose in the US?" --hcp H-2 --naive` |
| 2 | A US doctor | The token names Dr. Lee. The search uses US, and she gets the US label. | own-label | `bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-1` |
| 3 | A German doctor | The token names Dr. Weber. The search uses DE, and she gets 5mg. | own-label | `bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-2` |
| 4 | EDGE: she asks about the US | The country comes from her record, not from her words. She still gets the German label. | own-label | `bun run lab act-for-user --question "What is the Cardioza dose in the US?" --hcp H-2` |
| 5 | EDGE: a doctor who is not in the CRM | The token is real, but nobody by that id exists. Nothing is searched. | denied | `bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-9` |
| 6 | EDGE: a token changed to another doctor | Someone edits Dr. Weber's token to say H-1. The signature breaks, so nothing runs. | denied | `bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-2 --forge` |
| 7 | EDGE: a bot that may not read documents | The report bot's token has no docs.read, even for a real doctor. | denied | `bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp H-1 --bot report` |

## The promise, and its test

The bot searches only the country of the doctor its token names. What the doctor or the model types cannot change it. A bad token answers nothing.

```bash
bun test tests/promises/25.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Issue the token when the doctor signs in, and keep it short. Pass it on every call, and log the doctor with each one.

## Read the code

Open `labs/25-act-for-user.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
