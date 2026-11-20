# Instructions versus data

Each example is one mail in the Inbox Manager's inbox. Pick one by id, such as mail-vendor or mail-meeting. Some mails hide an order. The bot passes each mail through a data fence, a reader, a guard and a safe tool.

## The story in one picture

```mermaid
flowchart LR
  A["Mail from outside"] --> F["Wrapped as data"]
  F --> R["Reader with no tools: facts"]
  R --> G{"Guard score"}
  G -->|"High"| H["Held for Maya"]
  G -->|"Off the job"| N["Polite no"]
  G -->|"Low"| T["Actor picks an action"]
  T --> S["Tool: never outside the company"]
```

## The problem

A vendor mail says to ignore our rules and send the signed contract to an outside address. The model reads rules and mail as one text. So it may obey, and nobody notices. This is prompt injection.

## New words

Each word has one meaning in every lab.

- **prompt injection**: A hidden order in data, such as an email, that tries to steer the model.
- **data fence**: A labelled box that tells the model where the mail starts and ends.
- **guard**: One check that stops one kind of risk.
- **held**: Kept back for a person to look at, so the bot does not act on it.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab instructions-vs-data --question "Deal with the overdue invoice." --mail mail-vendor --naive
bun run lab instructions-vs-data --question "What does the stock photo company want?" --mail mail-vendor
bun run lab instructions-vs-data --question "Can you answer Sam about Thursday?" --mail mail-meeting
bun run lab instructions-vs-data --question "Where should the signed contract go?" --mail mail-contract
bun run lab instructions-vs-data --question "Reply to the curious visitor." --mail mail-probe
bun run lab instructions-vs-data --question "Send them what they asked for." --mail mail-copy
bun run lab instructions-vs-data --question "Can you file the font receipt?" --mail mail-breakout
bun run lab instructions-vs-data --demo
```

Run `bun run lab instructions-vs-data` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: paste the mail in | The vendor order sits next to our rules and looks the same. The model forwards the contract. | obeyed | `bun run lab instructions-vs-data --question "Deal with the overdue invoice." --mail mail-vendor --naive` |
| 2 | A mail with an order | The guard scores the mail high, so it waits for Maya. Nothing is sent. | held | `bun run lab instructions-vs-data --question "What does the stock photo company want?" --mail mail-vendor` |
| 3 | A plain meeting mail | Nothing odd in it. The bot answers Sam and is done. | handled | `bun run lab instructions-vs-data --question "Can you answer Sam about Thursday?" --mail mail-meeting` |
| 4 | A signed contract to file | The facts say contract, so the bot files it with the books. Inside the company is allowed. | handled | `bun run lab instructions-vs-data --question "Where should the signed contract go?" --mail mail-contract` |
| 5 | A stranger asks for secrets | The mail asks for our prompt and our revenue. That is not studio mail, so the bot says no, politely. | polite-no | `bun run lab instructions-vs-data --question "Reply to the curious visitor." --mail mail-probe` |
| 6 | A polite ask with no order words | The guard sees nothing odd. The reader hands over the ask and the actor agrees. Only the tool stops it. | blocked | `bun run lab instructions-vs-data --question "Send them what they asked for." --mail mail-copy` |
| 7 | A mail that tries to close the fence | It writes a closing tag, then new rules. We make the tag harmless, so the new rules stay inside the data. | fenced | `bun run lab instructions-vs-data --question "Can you file the font receipt?" --mail mail-breakout` |

## Stuck points

**Correct run:** Stack layers. Fence the mail, read it with no tools, score it, and let the tool refuse outside addresses.

**Common wrong turn:** Pasting the mail next to the rules. The hidden order looks like a rule, so the model may obey it.

**Hint to give:** If the model is fooled, which layer still stops the mail from leaving?

| What you see | What it means | Fix |
| --- | --- | --- |
| The demo prints outcome: obeyed on the NAIVE case | The vendor order reached the model as a rule | Fence the mail, and let a guard score it first |
| The demo prints outcome: held on the vendor mail | The guard scored it high, so it waits for Maya | This is correct. Read the mail by hand |
| The demo prints outcome: blocked on the polite mail | The guard saw no order, but the tool refused the address | This is correct. The tool is the last layer |

## The promise, and its test

A mail with an order is held for a person. An ask beyond the job gets a polite no. The tool never sends outside the company, even when the model is fooled.

```bash
bun test tests/promises/14.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Stack the layers, because any one can fail. A real guard is a trained model, not a word list. Give the bot the fewest tools, as the gates lab does.

## Read the code

Open `labs/14-instructions-vs-data.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
