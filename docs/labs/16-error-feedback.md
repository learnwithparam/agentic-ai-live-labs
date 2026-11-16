# Lab 16: a useful error

Each example is a question like Cardioza in Germany. The pretend model first writes the call just as typed. Then it fixes the call from the error, up to 3 tries.

## The problem

A bare ERROR gives the model nothing to fix. It repeats itself until the loop runs out.

## New words

retry = try the call again. hint = what the error says is valid. ask a person = stop, because only they know what was meant.

## Run it

```bash
bun run lab 16          # a menu: pick an example
bun run lab 16 --demo   # every case, each with its reason
bun run lab 16 --naive  # the same menu, the naive way (case 1)
```

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: an error that says nothing | The country is Germany, which the tool does not accept. The error is just ERROR, so the model sends the same call three times and gives up. | `gave-up` | `bun run lab 16 --question "Cardioza in Germany" --naive` |
| 2 | A call that works | Nothing to fix. One try. | `answered` | `bun run lab 16 --question "Cardioza in US"` |
| 3 | A country spelled out | The error says to use US or DE. The model maps Germany to DE and tries again. | `fixed` | `bun run lab 16 --question "Cardioza in Germany"` |
| 4 | A drug with a typo | The error lists the known drugs. The model picks the one that looks like its typo. | `fixed` | `bun run lab 16 --question "Cardiozza in US"` |
| 5 | EDGE: two mistakes in one call | The country is fixed first, then the drug. That is three tries, which is exactly the limit. | `fixed` | `bun run lab 16 --question "Cardiozza in Germany"` |
| 6 | A country we do not serve | France is not US or DE. The model must not swap it for US, because that is a different doctor's label. A person decides. | `ask-person` | `bun run lab 16 --question "Cardioza in France"` |
| 7 | A drug nobody knows | Zorbex is not close to any known drug. Guessing could be dangerous, so a person decides. | `ask-person` | `bun run lab 16 --question "Zorbex in US"` |
| 8 | Valid call, no document | Dermalin has no German document. That is not an error, so there is no retry. The answer is no source. | `no-source` | `bun run lab 16 --question "Dermalin in DE"` |

## The promise, and its test

An error says what is valid, retries are capped, and a call that cannot be fixed goes to a person.

```bash
bun test tests/promises/16.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Write every tool error for a reader that cannot ask questions, and count how often each error appears.

## Read the code

Open `labs/16-error-feedback.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
