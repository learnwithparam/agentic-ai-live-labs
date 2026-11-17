# Lab 31: parallel workers

Each example prepares a call brief from three systems: documents, the profile and the emails. Pick the doctor with --hcp. Make a system fail with --stuck or --crash, and give the system name: docs, profile or emails.

## The problem

Three slow systems one after another take three seconds. One stuck system holds up the whole brief, and the rep walks into the call with nothing.

## New words

parallel = at the same time. deadline = the time we stop waiting. merge = put the parts of the result together. worker = one program that does one part.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Lee." --hcp H-1 --naive
bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Lee." --hcp H-1
bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Weber." --hcp H-2
bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Lee." --hcp H-1 --stuck emails
bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Lee." --hcp H-1 --crash profile
bun labs/31-parallel-workers.ts --demo
```

Run `bun labs/31-parallel-workers.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: one system after another | The systems run in a line. Three seconds go by before the brief is ready. | slow | `bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Lee." --hcp H-1 --naive` |
| 2 | Three workers at once | All three start together. The brief is ready in about one second. | complete | `bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Lee." --hcp H-1` |
| 3 | A German doctor | Dr. Weber has no emails. That worker answers that there are none, and the brief is still complete. | complete | `bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Weber." --hcp H-2` |
| 4 | EDGE: one system is stuck | The emails system never answers. The lead stops it at the deadline and sends the rest. | partial | `bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Lee." --hcp H-1 --stuck emails` |
| 5 | EDGE: one worker crashes | The profile worker dies. The brief names the missing part, and the other two come through. | partial | `bun labs/31-parallel-workers.ts --question "Please prepare a call brief for Dr. Lee." --hcp H-1 --crash profile` |

## The promise, and its test

All workers start at once. A worker that is late is stopped at the deadline, and one that crashes is named. The brief goes out with the parts that came back.

```bash
bun test tests/promises/31.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Give each worker its own result file or queue, so none overwrites another. Set the deadline from how long the rep can wait. Log which parts are missing.

## Read the code

Open `labs/31-parallel-workers.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
