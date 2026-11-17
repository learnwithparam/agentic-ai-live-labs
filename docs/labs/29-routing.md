# Lab 29: routing

Each example is one message in the care team inbox, from the doctor you pick with --hcp. The router sends it to the answer bot, the outreach bot or a person.

## The problem

One bot that answers everything also answers the rash message with a dose. A doctor reads it and trusts it.

## New words

router = the step that picks who handles a message. specialist = a bot or person that does one job well. fallback = where a message goes when nothing fits.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/29-routing.ts --demo
bun labs/29-routing.ts --question "What is the dose of Cardioza?" --hcp H-1
bun labs/29-routing.ts --demo
bun labs/29-routing.ts --demo
bun labs/29-routing.ts --question "Can you tell me why my last invoice was wrong?" --hcp H-1
bun labs/29-routing.ts --demo
bun labs/29-routing.ts --demo
```

Run `bun labs/29-routing.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: one bot for everything | The rash message reaches the answer bot, which replies from a dose document. | unsafe | `bun labs/29-routing.ts --demo` |
| 2 | A dose question | The model says answer, and the answer bot finds the label. | answer | `bun labs/29-routing.ts --question "What is the dose of Cardioza?" --hcp H-1` |
| 3 | A request for an email | The model says outreach, and the outreach bot writes the email. | outreach | `bun labs/29-routing.ts --demo` |
| 4 | EDGE: a rash on a patient | A danger word. The code sends it to a person before the model is asked. | human | `bun labs/29-routing.ts --demo` |
| 5 | EDGE: a message that fits no specialist | An invoice question is not the job of either bot. It goes to a person. | human | `bun labs/29-routing.ts --question "Can you tell me why my last invoice was wrong?" --hcp H-1` |
| 6 | EDGE: the doctor tells the router where to go | She asks for the answer bot, but the danger word wins. | human | `bun labs/29-routing.ts --demo` |

## The promise, and its test

A message with a danger word always goes to a person. Any route not on our list goes to a person. The other messages reach the specialist that fits.

```bash
bun test tests/promises/29.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Log every route with the message id. Review the person queue each week, and add a danger word when one slips past.

## Read the code

Open `labs/29-routing.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
