# Lab 15: when the loop must stop

Each example is a pretend model with one habit. Pick one by name: answers, stuck, wanders, expensive, just-in-time, too-late or retry-once. The loop allows 6 steps, 2 identical calls and 100 tokens.

## The problem

A model that is stuck never says it is done. A loop that trusts the model runs and bills forever.

## New words

step = one trip round the loop. repeat = the same call again. budget = the most we allow a run to spend.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/15-stop-conditions.ts --question "stuck" --naive
bun labs/15-stop-conditions.ts --question "answers"
bun labs/15-stop-conditions.ts --question "stuck"
bun labs/15-stop-conditions.ts --question "wanders"
bun labs/15-stop-conditions.ts --question "expensive"
bun labs/15-stop-conditions.ts --question "just-in-time"
bun labs/15-stop-conditions.ts --question "too-late"
bun labs/15-stop-conditions.ts --question "retry-once"
bun labs/15-stop-conditions.ts --demo
```

Run `bun labs/15-stop-conditions.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: trust the model to stop | The model keeps making the same call. With no limit of our own, the loop never ends. The demo cuts it at 200 steps. | never-stopped | `bun labs/15-stop-conditions.ts --question "stuck" --naive` |
| 2 | A model that answers | One search, then an answer. The normal case. No limit is touched. | answered | `bun labs/15-stop-conditions.ts --question "answers"` |
| 3 | A model that is stuck | The same call again and again. We allow it twice, because a retry can be fair. The third time we stop. | repeat | `bun labs/15-stop-conditions.ts --question "stuck"` |
| 4 | A model that wanders | A new call each time, so it is not a repeat. The step limit ends it. | max-steps | `bun labs/15-stop-conditions.ts --question "wanders"` |
| 5 | A model with costly calls | Each call costs 40 tokens. The third would pass the budget of 100, so we stop before paying. | out-of-budget | `bun labs/15-stop-conditions.ts --question "expensive"` |
| 6 | EDGE: an answer at the last step | The answer comes on step 6, the last one allowed. It is read. | answered | `bun labs/15-stop-conditions.ts --question "just-in-time"` |
| 7 | EDGE: an answer one step too late | The answer would come on step 7. We stop first, so it is never read. Choose limits for the real task. | max-steps | `bun labs/15-stop-conditions.ts --question "too-late"` |
| 8 | A fair retry | The same call twice, then an answer. Two identical calls are allowed, so this is fine. | answered | `bun labs/15-stop-conditions.ts --question "retry-once"` |

## The promise, and its test

A run always stops within its steps and its budget, and says why it stopped.

```bash
bun test tests/promises/15.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Set the limits per task, alert when a run hits one, and show the stop reason to the person.

## Read the code

Open `labs/15-stop-conditions.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
