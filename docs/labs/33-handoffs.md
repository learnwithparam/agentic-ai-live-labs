# Handing work between bots

Each example sends one mail through a team of bots: inbox, expense and a reply writer. Each handoff passes it to the next bot in an envelope. Pick the mail with --mail, and change the hop limit with --limit.

## The story in one picture

```mermaid
flowchart LR
  A["Inbox bot reads the mail"] --> B["Expense bot files the receipt"]
  B --> C["Reply bot writes back"]
  C --> D{"Hops left?"}
  D -->|"Yes"| A
  D -->|"No"| X["Stop: hop limit"]
```

## The problem

Two bots can each think the other should do the work. The message goes back and forth, and the sender gets no reply. A pasted chat log also loses the amount.

## New words

Each word has one meaning in every lab.

- **handoff**: One bot passes the work to another bot.
- **envelope**: The wrapper around a message. It counts the hops and lists the bots it passed.
- **hop**: One step where work passes from one bot or agent to another.
- **loop breaker**: A rule that stops a message that keeps going round in circles.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab handoffs --question "File the receipt and reply to the sender." --mail mail-receipt --naive
bun run lab handoffs --question "File the receipt from FontShop." --mail mail-receipt --chat
bun run lab handoffs --question "File the receipt from FontShop." --mail mail-receipt
bun run lab handoffs --question "Reply to the client who sent the contract." --mail mail-contract
bun run lab handoffs --question "File the receipt and reply to the sender." --mail mail-receipt
bun run lab handoffs --question "Please pay my parking ticket." --mail mail-probe
bun run lab handoffs --question "File the receipt from FontShop." --mail mail-receipt --limit 0
bun run lab handoffs --demo
```

Run `bun run lab handoffs` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: no envelope, no count | The expense bot and the reply bot pass the message back and forth until we cut it off. | looped | `bun run lab handoffs --question "File the receipt and reply to the sender." --mail mail-receipt --naive` |
| 2 | NAIVE: a pasted chat log | The expense bot only gets the chat text. The amount from the font receipt never arrives. | lost | `bun run lab handoffs --question "File the receipt from FontShop." --mail mail-receipt --chat` |
| 3 | A receipt goes to the expense bot | The inbox bot sends it to the expense bot. The envelope carries 12.5 USD to the books. | delivered | `bun run lab handoffs --question "File the receipt from FontShop." --mail mail-receipt` |
| 4 | A reply goes to the reply bot | The inbox bot sends the contract mail to the reply bot, which writes the answer. | delivered | `bun run lab handoffs --question "Reply to the client who sent the contract." --mail mail-contract` |
| 5 | EDGE: two bots send it back and forth | The envelope sees the expense bot a second time and stops. A person gets the path. | stopped | `bun run lab handoffs --question "File the receipt and reply to the sender." --mail mail-receipt` |
| 6 | EDGE: a message that fits no bot | The inbox bot has no bot for a parking ticket, so a person gets it at once. | human | `bun run lab handoffs --question "Please pay my parking ticket." --mail mail-probe` |
| 7 | EDGE: the hop limit is tiny | The limit is zero hops. Even the first handoff is refused, though nothing is wrong. | stopped | `bun run lab handoffs --question "File the receipt from FontShop." --mail mail-receipt --limit 0` |

## Stuck points

**Correct run:** Put each message in an envelope with the receipt and its amount. Stop it at the hop limit or a repeat, then send it to a person.

**Common wrong turn:** Passing messages with no count, or as a pasted chat log. The bots loop, or the amount is lost.

**Hint to give:** How would a bot know it has seen this message before?

| What you see | What it means | Fix |
| --- | --- | --- |
| The demo prints outcome: looped on the NAIVE case | No envelope, so no count or path | Add an envelope with a hop count and a path |
| The demo prints outcome: lost on the chat log case | A pasted chat has no typed amount | Put the amount in a typed field of the envelope |
| The message is stopped at the limit | The hop limit was reached | Read the path, then fix the loop |
| A bot is met twice | The loop breaker fired | This is correct. A person gets the list of bots |

## The promise, and its test

Every message travels in an envelope with the receipt and its amount. It stops at the hop limit, or when it meets a bot twice. Then a person gets it, with the list of bots it met.

```bash
bun test tests/promises/33.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Put the envelope on a queue, with its id, hop count and path. A loop breaker alerts Maya when a message is stopped. Keep the limit small. A lead that hands work down to bots is easy to stop. Bots that react to events, such as draft rejected, need the same hop count.

## Read the code

Open `labs/33-handoffs.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
