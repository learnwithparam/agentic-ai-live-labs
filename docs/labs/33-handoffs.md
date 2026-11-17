# Lab 33: handing work between bots

Each example sends one message through a team of bots: intake, answer and outreach. Pick the doctor with --hcp. Change the hop limit with --limit.

## The problem

Two bots can each think the other should do the work. The message goes back and forth for ever, and no doctor gets a reply.

## New words

handoff = one bot passes work to another. envelope = the wrapper that travels with the message. hop = one handoff. loop breaker = a rule that stops a message that goes in circles.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/33-handoffs.ts --question "Please email Dr. Lee the dose of Cardioza." --hcp H-1 --naive
bun labs/33-handoffs.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1
bun labs/33-handoffs.ts --demo
bun labs/33-handoffs.ts --question "Please email Dr. Lee the dose of Cardioza." --hcp H-1
bun labs/33-handoffs.ts --question "Please call me back about my last invoice." --hcp H-1
bun labs/33-handoffs.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --limit 0
bun labs/33-handoffs.ts --demo
```

Run `bun labs/33-handoffs.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: no envelope, no count | The outreach bot and the answer bot pass the message back and forth until we cut it off. | looped | `bun labs/33-handoffs.ts --question "Please email Dr. Lee the dose of Cardioza." --hcp H-1 --naive` |
| 2 | A dose goes to the answer bot | Intake sends it to the answer bot, which gives the dose. | delivered | `bun labs/33-handoffs.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1` |
| 3 | An email goes to the outreach bot | Intake sends it to the outreach bot, which writes the email. | delivered | `bun labs/33-handoffs.ts --demo` |
| 4 | EDGE: two bots send it back and forth | The envelope sees the outreach bot a second time and stops. A person gets the path. | stopped | `bun labs/33-handoffs.ts --question "Please email Dr. Lee the dose of Cardioza." --hcp H-1` |
| 5 | EDGE: a message that fits no bot | The intake bot has no bot for an invoice, so a person gets it at once. | human | `bun labs/33-handoffs.ts --question "Please call me back about my last invoice." --hcp H-1` |
| 6 | EDGE: the hop limit is tiny | The limit is zero hops. Even the first handoff is refused, though nothing is wrong. | stopped | `bun labs/33-handoffs.ts --question "What is the dose of Cardioza for Dr. Lee?" --hcp H-1 --limit 0` |

## The promise, and its test

Every message travels in an envelope. It stops at the hop limit, or when it meets a bot twice. Then a person gets it with the list of bots it met.

```bash
bun test tests/promises/33.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Put the envelope on a queue, with its id, hop count and path. Alert a person when a message is stopped. Keep the limit small, because real work rarely needs many hops.

## Read the code

Open `labs/33-handoffs.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
