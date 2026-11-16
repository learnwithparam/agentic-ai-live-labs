# Lab 5: tool schemas and structured output

The question box takes the text a model wrote as its tool call. A schema checks it first. A good call runs. An easy fix is made and noted. A bad call is rejected, and the tool never runs.

## The problem

A model writes tool calls as text. A small mistake can fail with no error at all.

## New words

schema = the shape of a good call. JSON = text that holds fields. reject = refuse to run.

## Run it

```bash
bun run lab 5          # a menu: pick an example
bun run lab 5 --demo   # every case, each with its reason
bun run lab 5 --naive  # the same menu, the naive way (case 1)
```

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: trust the text | The country is written in lower case. With no check, the search finds nothing and nobody is told why. It looks like there is no approved document. | `silent-miss` | `bun run lab 5 --question "{"drug": "Cardioza", "country": "us"}" --naive` |
| 2 | A good call | Every field is right. The tool runs. | `ok` | `bun run lab 5 --question "{"drug": "Cardioza", "country": "US", "limit": 2}"` |
| 3 | Easy fix: lower case country | The fix is safe, so we make it and write a note. The same call now finds the document. | `repaired` | `bun run lab 5 --question "{"drug": "Cardioza", "country": "us"}"` |
| 4 | Easy fix: a number written as text | The limit is the text 3. We turn it into the number 3 and note it. | `repaired` | `bun run lab 5 --demo` |
| 5 | Extra field the schema does not know | A field called delete_all is dropped and noted. The tool never sees it. | `repaired` | `bun run lab 5 --demo` |
| 6 | Missing field | No drug, so there is nothing to search. We reject. We do not guess. | `rejected` | `bun run lab 5 --question "{"country": "US"}"` |
| 7 | A country we do not serve | FR is not in the allowed list. A wrong country could show the wrong label, so we reject. | `rejected` | `bun run lab 5 --question "{"drug": "Cardioza", "country": "FR"}"` |
| 8 | Number out of range | A limit of 99 is above the top of the range, which is 5. | `rejected` | `bun run lab 5 --question "{"drug": "Cardioza", "country": "US", "limit": 99}"` |
| 9 | Not JSON at all | The model wrote a sentence. There is no call to run. | `rejected` | `bun run lab 5 --question "Please search for Cardioza in the US"` |

## The promise, and its test

A call that fails the schema never reaches the tool.

```bash
bun test tests/promises/05.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Every tool gets a schema. Real systems use a schema library and the model API's own tool format.

## Read the code

Open `labs/05-tool-schemas.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
