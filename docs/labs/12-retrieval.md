# Lab 12: retrieval

Each example is a question about a drug. Six invented chunks are searched. Use --country DE for a German doctor. Only chunks from the doctor's country are searched.

## The problem

The model cannot read every document. If we send the wrong chunk, it answers from the wrong source.

## New words

chunk = a small piece of a document. score = how well a chunk matches the question. retrieval = finding the best chunks to send.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab 12 --question "Cardioza dose" --naive --country DE
bun run lab 12 --question "Cardioza dose" --country US
bun run lab 12 --question "Cardioza dose" --country DE
bun run lab 12 --question "Cardioza side effects" --country US
bun run lab 12 --question "Cardioza dose and Neurovex dose" --country US
bun run lab 12 --question "CARDIOZA DOSE?!" --country US
bun run lab 12 --question "Cardioza please" --country US
bun run lab 12 --question "Dermalin cream use" --country DE
bun run lab 12 --question "weather in Berlin" --country DE
bun run lab 12 --demo
```

Run `bun run lab 12` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: best chunk from anywhere | A German doctor asks for the dose. Two chunks match equally well and the US chunk comes first. The doctor gets the US dose. | wrong-country | `bun run lab 12 --question "Cardioza dose" --naive --country DE` |
| 2 | A US doctor asks for a dose | The right chunk matches on two words. The side effects chunk matches on only one, so it stays out. | found | `bun run lab 12 --question "Cardioza dose" --country US` |
| 3 | A German doctor asks for a dose | The same question gives the German chunk, because we filter by country first. | found | `bun run lab 12 --question "Cardioza dose" --country DE` |
| 4 | A different topic for one drug | Side effects of the same drug. The score picks the side effects chunk and not the dose chunk. | found | `bun run lab 12 --question "Cardioza side effects" --country US` |
| 5 | Two drugs in one question | Both drugs match, so we send two chunks. We never send more than two. | found | `bun run lab 12 --question "Cardioza dose and Neurovex dose" --country US` |
| 6 | Capital letters and punctuation | The words are cleaned first, so shouting does not change the answer. | found | `bun run lab 12 --question "CARDIOZA DOSE?!" --country US` |
| 7 | A question with one matching word | Only the drug name matches. One word is too weak to trust. We ask the doctor to say more. | too-vague | `bun run lab 12 --question "Cardioza please" --country US` |
| 8 | A drug with no chunk in this country | Dermalin has only a US chunk. We never fall back to another country. We say there is no source. | no-source | `bun run lab 12 --question "Dermalin cream use" --country DE` |
| 9 | Nothing to do with drugs | No word matches any chunk. The answer is no source. We do not send the closest bad match. | no-source | `bun run lab 12 --question "weather in Berlin" --country DE` |

## The promise, and its test

Only chunks from the doctor's country, with a strong score, are returned. Otherwise we say there is no source.

```bash
bun test tests/promises/12.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Score with embeddings as well as words, and log which chunk ids were sent on every answer.

## Read the code

Open `labs/12-retrieval.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
