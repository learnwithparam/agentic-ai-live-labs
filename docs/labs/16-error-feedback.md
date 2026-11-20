# A useful error

Each example is a receipt the Expense Manager must file, such as the font licence. The model writes the filing call, reads each error, and fixes the call, up to 3 tries. Each try after a failure is a retry.

## The story in one picture

```mermaid
flowchart LR
  A["Filing call has a wrong category"] --> B["API names the allowed ones"]
  B --> C["Model tries again"]
  C --> D{"Fixed, within the retry limit?"}
  D -->|"Yes"| E["Done"]
  D -->|"No"| F["Ask a person"]
```

## The problem

A bare ERROR gives the model no hint to fix. It repeats the same call until the loop runs out.

## New words

Each word has one meaning in every lab.

- **retry**: Try the same call again after it failed.
- **hint**: A short line that says what the error expected, so the model can fix its call.
- **ask a person**: Stop and let a person decide, because only they know what was meant.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab error-feedback --question "File the font licence receipt." --naive
bun run lab error-feedback --question "File the cloud hosting bill as hosting."
bun run lab error-feedback --question "File the Acme client lunch."
bun run lab error-feedback --question "Please book the train ticket as travel."
bun run lab error-feedback --question "Next, the font licence receipt."
bun run lab error-feedback --question "Can you file the team gift cards?"
bun run lab error-feedback --question "Please handle the parking fine from Friday."
bun run lab error-feedback --demo
```

Run `bun run lab error-feedback` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: an error that says nothing | The model writes the category fonts, which the API does not accept. The error only says ERROR, so the model sends the same call three times and gives up. | gave-up | `bun run lab error-feedback --question "File the font licence receipt." --naive` |
| 2 | A call that works | The task names the category. Nothing to fix, so one try. | answered | `bun run lab error-feedback --question "File the cloud hosting bill as hosting."` |
| 3 | A category the API does not know | The model writes lunch. The error lists the five categories, so the model picks meals and tries again. | fixed | `bun run lab error-feedback --question "File the Acme client lunch."` |
| 4 | A receipt id with a typo | The model writes a receipt id that does not exist. The error lists the real ids, so the model picks the right one. | fixed | `bun run lab error-feedback --question "Please book the train ticket as travel."` |
| 5 | EDGE: two mistakes in one call | The receipt id is fixed first, then the category. That is three tries, which is exactly the limit. | fixed | `bun run lab error-feedback --question "Next, the font licence receipt."` |
| 6 | A receipt that fits no category | Gift cards are not software, meals, hosting, travel or office. The model must not pick one at random, so a person decides. | ask-person | `bun run lab error-feedback --question "Can you file the team gift cards?"` |
| 7 | A receipt nobody has seen | There is no parking receipt in the books. The model cannot guess one, so a person decides. | ask-person | `bun run lab error-feedback --question "Please handle the parking fine from Friday."` |

## Stuck points

**Correct run:** Return an error that says what is valid, so the model can fix its call. A call that cannot be fixed goes to a person.

**Common wrong turn:** Returning a bare ERROR. The model repeats the same call until it runs out of tries.

**Hint to give:** What would the model need to read to change its call?

| What you see | What it means | Fix |
| --- | --- | --- |
| The demo prints outcome: gave-up on the NAIVE case | The same call was sent three times | Name the allowed categories in the error text |
| The model fixed its call, and the tool ran | The error said what was wrong | This is correct. The hint did its job |
| A retry never stops | The retry cap is missing | Cap the retries, then ask a person |

## The promise, and its test

An error says what is valid. Retries are capped. A receipt that fits no category means we ask a person.

```bash
bun test tests/promises/16.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Write every tool error for a reader that cannot ask questions. Name the allowed values, and count how often each error appears.

## Read the code

Open `labs/16-error-feedback.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
