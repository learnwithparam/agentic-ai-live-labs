# Lab 35: wake the bot and show its work

Each example wakes a bot. Give the hours of each wakeup with --times. Give webhook ids with --events, and send the same id twice to see a repeat. Add --fail true to make the model fail.

## The problem

A bot that wakes by itself can run twice, and nobody sees it. A tick repeats, or a webhook arrives twice, and the work is done again.

## New words

wakeup = a moment when a bot starts by itself. slot = one period, such as one day. board = a list of cards that show every run. idempotent = safe to run twice.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose for Dr. Lee every day." --times '0,5' --naive
bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose for Dr. Lee every day." --times '0,5,25'
bun labs/35-wakeups-and-board.ts --demo
bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose for Dr. Lee every day." --times 0 --fail
bun labs/35-wakeups-and-board.ts --demo
```

Run `bun labs/35-wakeups-and-board.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: every wakeup runs | The bot wakes at hour 0 and again at hour 5, which is the same day. It does the day's work twice. | duplicates | `bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose for Dr. Lee every day." --times '0,5' --naive` |
| 2 | One run for each day | Hours 0 and 5 are one day, and hour 25 is the next. The board has two cards. | once | `bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose for Dr. Lee every day." --times '0,5,25'` |
| 3 | A webhook arrives twice | The same label event is delivered two times. The second delivery is ignored. | once | `bun labs/35-wakeups-and-board.ts --demo` |
| 4 | EDGE: the model fails | The model is down. The board shows a failed card, so a person can see it. | failed | `bun labs/35-wakeups-and-board.ts --question "Check the Cardioza dose for Dr. Lee every day." --times 0 --fail` |

## The promise, and its test

A key runs once. Every run is a card, and a failed run is a card that says failed.

```bash
bun test tests/promises/35.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Use your scheduler or a queue, and keep the keys in a database. Alert a person when a card says failed, or says running for too long.

## Read the code

Open `labs/35-wakeups-and-board.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
