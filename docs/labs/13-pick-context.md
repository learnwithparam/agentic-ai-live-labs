# Lab 13: picking what goes in

Each example is a question from Dr. Lee. Three sources are on the shelf: documents, the doctor's profile and past emails. We load only the ones the question needs.

## The problem

Loading everything is easy. It costs tokens, hides the useful part, and shows private data that has nothing to do with the question.

## New words

source = a place facts come from. picking = choosing sources per question. overloaded = more context than the question needs.

## Run it

```bash
bun run lab 13          # a menu: pick an example
bun run lab 13 --demo   # every case, each with its reason
bun run lab 13 --naive  # the same menu, the naive way (case 1)
```

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: load every source | Every question carries the documents, the profile and the emails. A dose question does not need the emails, and now the model can quote them. | `overloaded` | `bun run lab 13 --question "What is the Cardioza dose?" --naive` |
| 2 | A dose question | Only the documents are loaded. The profile and the emails stay on the shelf. | `picked` | `bun run lab 13 --question "What is the Cardioza dose?"` |
| 3 | An email question | Only the emails are loaded. | `picked` | `bun run lab 13 --question "Which email was sent to me last?"` |
| 4 | Two needs in one question | The question needs the profile and the documents, so both are loaded. The emails are not. | `picked` | `bun run lab 13 --question "Given my profile, what is the label?"` |
| 5 | Capital letters | Words are lower-cased before matching, so shouting changes nothing. | `picked` | `bun run lab 13 --question "DOSE???"` |
| 6 | Small talk | No keyword matches. We load nothing, and the agent asks what the doctor needs. | `unclear` | `bun run lab 13 --question "Hello there"` |
| 7 | EDGE: a word used in another way | A doctor jokes about a email. The word list cannot tell a joke from a request, so it loads the emails. Keyword rules are crude, and a model chooses better. | `picked` | `bun run lab 13 --question "I never read my email anyway"` |
| 8 | An empty question | Nothing to match, so nothing is loaded. | `unclear` | `bun run lab 13 --question ""` |

## The promise, and its test

A question loads only the sources whose keyword it holds. A question with no keyword loads nothing, and the agent asks.

```bash
bun test tests/promises/13.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Let the model choose with a tool call, and log which sources each answer used.

## Read the code

Open `labs/13-pick-context.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
