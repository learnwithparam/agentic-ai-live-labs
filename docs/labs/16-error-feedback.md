# Lab 16: a useful error

Each example is a question like Cardioza in Germany. The model writes the tool call, reads each error, and fixes the call, up to 3 tries.

## The problem

A bare ERROR gives the model nothing to fix. It repeats itself until the loop runs out.

## New words

retry = try the call again. hint = what the error says is valid. ask a person = stop, because only they know what was meant.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/16-error-feedback.ts --question "What is the dose of Cardioza in Germany?" --naive
bun labs/16-error-feedback.ts --question "What is the dose of Cardioza in the US?"
bun labs/16-error-feedback.ts --question "What is the dose of Cardioza in Germany?"
bun labs/16-error-feedback.ts --question "What is the dose of Cardiozza in the US?"
bun labs/16-error-feedback.ts --question "What is the dose of Cardiozza in Germany?"
bun labs/16-error-feedback.ts --question "What is the dose of Cardioza in France?"
bun labs/16-error-feedback.ts --question "What is the dose of Zorbex in the US?"
bun labs/16-error-feedback.ts --question "What is the dose of Dermalin in Germany?"
bun labs/16-error-feedback.ts --demo
```

Run `bun labs/16-error-feedback.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: an error that says nothing | The country is Germany, which the tool does not accept. The error only says ERROR, so the model sends the same call three times and gives up. | gave-up | `bun labs/16-error-feedback.ts --question "What is the dose of Cardioza in Germany?" --naive` |
| 2 | A call that works | Nothing to fix. One try. | answered | `bun labs/16-error-feedback.ts --question "What is the dose of Cardioza in the US?"` |
| 3 | A country spelled out | The error says to use US or DE. The model maps Germany to DE and tries again. | fixed | `bun labs/16-error-feedback.ts --question "What is the dose of Cardioza in Germany?"` |
| 4 | A drug with a typo | The error lists the known drugs. The model picks the one that looks like its typo. | fixed | `bun labs/16-error-feedback.ts --question "What is the dose of Cardiozza in the US?"` |
| 5 | EDGE: two mistakes in one call | The country is fixed first, then the drug. That is three tries, which is exactly the limit. | fixed | `bun labs/16-error-feedback.ts --question "What is the dose of Cardiozza in Germany?"` |
| 6 | A country we do not serve | France is not US or DE. The model must not swap it for US, because that is a different doctor's label. A person decides. | ask-person | `bun labs/16-error-feedback.ts --question "What is the dose of Cardioza in France?"` |
| 7 | A drug nobody knows | Zorbex is not close to any known drug. Guessing could be dangerous, so a person decides. | ask-person | `bun labs/16-error-feedback.ts --question "What is the dose of Zorbex in the US?"` |
| 8 | Valid call, no document | Dermalin has no German document. That is not an error, so there is no retry. The answer is no source. | no-source | `bun labs/16-error-feedback.ts --question "What is the dose of Dermalin in Germany?"` |

## The promise, and its test

An error says what is valid. Retries are capped. A call that cannot be fixed goes to a person.

```bash
bun test tests/promises/16.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Write every tool error for a reader that cannot ask questions, and count how often each error appears.

## Read the code

Open `labs/16-error-feedback.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
