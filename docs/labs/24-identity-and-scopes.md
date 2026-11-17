# Lab 24: identity and scopes

Each example sends a doctor's request to one of three bots: answer, outreach or report. Pick the bot with --bot. The model says which tools the request needs. Then each tool call must show the bot's signed token.

## The problem

If every bot shares one key, any bot can do anything. A bot that only answers questions can still send email.

## New words

identity = who is calling. scope = one thing a token may do. least privilege = a bot gets only the scopes it needs. token = a signed note that lists them.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/24-identity-and-scopes.ts --demo
bun labs/24-identity-and-scopes.ts --question "What is the dose of Cardioza?" --bot answer
bun labs/24-identity-and-scopes.ts --demo
bun labs/24-identity-and-scopes.ts --demo
bun labs/24-identity-and-scopes.ts --question "How many doctors are in our CRM?" --bot report
bun labs/24-identity-and-scopes.ts --question "How many doctors are in our CRM?" --bot answer
bun labs/24-identity-and-scopes.ts --question "What is the dose of Cardioza?" --bot answer --forge
bun labs/24-identity-and-scopes.ts --question "What is the dose of Cardioza?" --bot answer --expired
bun labs/24-identity-and-scopes.ts --demo
```

Run `bun labs/24-identity-and-scopes.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: one key for every bot | All bots share one key that may do everything. The answer bot was asked to email Dr. Lee, and it did. | overreach | `bun labs/24-identity-and-scopes.ts --demo` |
| 2 | The answer bot answers | The request needs only the search tool. The answer bot's token lists docs.read, so it runs. | allowed | `bun labs/24-identity-and-scopes.ts --question "What is the dose of Cardioza?" --bot answer` |
| 3 | The answer bot is asked to email | The search runs. The email does not, because the answer bot's token has no email.send. | partly-denied | `bun labs/24-identity-and-scopes.ts --demo` |
| 4 | The outreach bot may email | Its token lists email.send, so both tools run. It is the right bot for this job. | allowed | `bun labs/24-identity-and-scopes.ts --demo` |
| 5 | The report bot reads the CRM | Its token lists crm.read. It counts the doctors and nothing more. | allowed | `bun labs/24-identity-and-scopes.ts --question "How many doctors are in our CRM?" --bot report` |
| 6 | The answer bot is asked about the CRM | The answer bot has no crm.read. Doctor records stay closed to it. | denied | `bun labs/24-identity-and-scopes.ts --question "How many doctors are in our CRM?" --bot answer` |
| 7 | EDGE: a token with a changed scope | Someone edits the answer bot's token to add email.send. The signature no longer matches, so every call is refused. | denied | `bun labs/24-identity-and-scopes.ts --question "What is the dose of Cardioza?" --bot answer --forge` |
| 8 | EDGE: an old token | The token lasted five minutes and that time has passed. A stolen token stops working on its own. | denied | `bun labs/24-identity-and-scopes.ts --question "What is the dose of Cardioza?" --bot answer --expired` |

## The promise, and its test

A tool call runs only when the token is real and not expired. The token must also list the scope the tool needs. A bot never does more than its own list.

```bash
bun test tests/promises/24.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Keep the secret in a vault and rotate it. Issue short tokens from one place. Log the bot name on every call.

## Read the code

Open `labs/24-identity-and-scopes.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
