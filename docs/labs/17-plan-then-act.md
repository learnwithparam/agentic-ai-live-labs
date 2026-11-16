# Lab 17: plan, then act

Each example is a plan the model wrote. Pick one by name: look-up, send-reply, delete-files, too-long or no-source. The code checks the plan before any step runs.

## The problem

Step by step, the email is sent before anyone sees that the plan was wrong.

## New words

plan = the list of steps, written before the first one runs. risky step = one that cannot be undone, like sending an email.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/17-plan-then-act.ts --question "send-reply" --naive
bun labs/17-plan-then-act.ts --question "look-up"
bun labs/17-plan-then-act.ts --question "send-reply"
bun labs/17-plan-then-act.ts --question "send-reply" --approve
bun labs/17-plan-then-act.ts --question "delete-files"
bun labs/17-plan-then-act.ts --question "too-long"
bun labs/17-plan-then-act.ts --question "no-source"
bun labs/17-plan-then-act.ts --demo
```

Run `bun labs/17-plan-then-act.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: act with no plan | The model asks for the steps one at a time. The email is sent before anyone could say no. | ran-unchecked | `bun labs/17-plan-then-act.ts --question "send-reply" --naive` |
| 2 | A safe plan | Search, then draft. Nothing risky, so it runs. | done | `bun labs/17-plan-then-act.ts --question "look-up"` |
| 3 | A plan that sends an email | Sending cannot be undone. Nothing runs until a person approves, not even the safe steps. | needs-approval | `bun labs/17-plan-then-act.ts --question "send-reply"` |
| 4 | The same plan, approved | A person said yes, so every step runs. | done | `bun labs/17-plan-then-act.ts --question "send-reply" --approve` |
| 5 | A plan with a tool we never gave | There is no delete_records tool. The plan is rejected, and the search never runs. | rejected | `bun labs/17-plan-then-act.ts --question "delete-files"` |
| 6 | EDGE: a plan that is too long | Six steps is over our limit of five. A long plan is a sign the model is lost. | rejected | `bun labs/17-plan-then-act.ts --question "too-long"` |
| 7 | EDGE: the first step finds nothing | There is no approved document for Zorbex. The draft would be made up, so the run stops. | stopped | `bun labs/17-plan-then-act.ts --question "no-source"` |

## The promise, and its test

A plan is checked before it runs. A risky step needs a person. A failed step stops the rest.

```bash
bun test tests/promises/17.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Show the plan to the person, keep it with the run, and compare what ran with what was planned.

## Read the code

Open `labs/17-plan-then-act.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
