# Lab 28: evals and the release gate

Each example is a new version of the document search. Pick it with --version: current, wide or invents. We run every eval question through it, then decide if it may ship.

## The problem

A change that looks fine ships because it still answers. It gives a German doctor the US dose, and nobody finds out until she does.

## New words

eval = a real question with the facts a right answer must have. eval set = the list of evals. release gate = the check that blocks a bad version. regression = something that worked and now does not.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version wide --naive
bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version current
bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version wide
bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version invents
bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version current --evals none
bun labs/28-evals-and-release.ts --demo
```

Run `bun labs/28-evals-and-release.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: ship if it runs | The wide version answers every question, so the naive gate ships it. Dr. Weber gets the US dose. | shipped-wrong | `bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version wide --naive` |
| 2 | The current version | Every eval passes, so the release goes out. | released | `bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version current` |
| 3 | EDGE: the wide version | Dr. Weber's question gets the US document. That eval fails and the release is blocked. | blocked | `bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version wide` |
| 4 | EDGE: the version that makes things up | For an unknown drug it writes a made-up document and a dose. The Zorbex eval fails. | blocked | `bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version invents` |
| 5 | EDGE: nobody wrote any evals | Zero evals pass, but nothing was tested. An empty set blocks the release. | blocked | `bun labs/28-evals-and-release.ts --question "Is this new version ready to release?" --version current --evals none` |

## The promise, and its test

A version ships only when every eval passes. A failed eval blocks it and names the question. An empty eval set blocks everything.

```bash
bun test tests/promises/28.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Run the evals on every change, on the same model you ship. Add a new eval each time a bug gets out. Never delete one to make a release pass.

## Read the code

Open `labs/28-evals-and-release.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
