# Private data in a vault

Each example saves a case record for a doctor's note. The vault swaps each real value for a token, such as [SSN-1]. The model never reads the real private data. Pick who looks at the record with --role: reviewer or agent.

## The story in one picture

```mermaid
flowchart LR
  A["Note with a real name"] --> B["Swap the name for a token"]
  B --> C["Model sees only the token"]
  C --> D{"Reviewer approves?"}
  D -->|"Yes"| E["Vault puts the name back"]
  D -->|"No"| F["Token stays"]
```

## The problem

A fixed mask hides the data from the model, but it also hides it from the reviewer. Nobody can get the value back.

## New words

Each word has one meaning in every lab.

- **token**: A short label, such as [SSN] or [SSN-1], that stands in for a private value.
- **vault**: The place that keeps the real values behind the tokens.
- **role**: What a person is allowed to do, such as review a record.
- **audit log**: A list of every try, allowed or refused.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab phi-vault --demo
bun run lab phi-vault --demo
bun run lab phi-vault --demo
bun run lab phi-vault --demo
bun run lab phi-vault --demo
```

Run `bun run lab phi-vault` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: a fixed mask | The reviewer opens the record. It says [SSN], and the real number is gone for good. | lost | `bun run lab phi-vault --demo` |
| 2 | A reviewer opens the record | The model read [SSN-1]. The reviewer sees the real number, and the audit file has one line. | revealed | `bun run lab phi-vault --demo` |
| 3 | An agent opens the record | An agent is not a reviewer. The record keeps its tokens, and the refused try is in the audit file. | hidden | `bun run lab phi-vault --demo` |
| 4 | EDGE: the same number twice | The SSN is in the note two times. Both get [SSN-1], and the phone gets its own token. | hidden | `bun run lab phi-vault --demo` |

## Stuck points

**Correct run:** The model sees tokens only. A reviewer can turn a token back into its value, and every try is logged.

**Common wrong turn:** A fixed mask, such as [SSN] for every number. The reviewer cannot get the value back.

**Hint to give:** How can the reviewer tell two different numbers apart?

| What you see | What it means | Fix |
| --- | --- | --- |
| The demo prints outcome: lost on the NAIVE case | The fixed mask hid the value for good | Use a numbered token, such as [SSN-1], and keep the vault |
| The reply shows only tokens | The vault hid the real values from the agent | This is correct. The agent must not see values |
| A reviewer sees a real value | The role is reviewer | This is correct. Check the audit log for the reviewer |

## The promise, and its test

The model sees tokens only. The same value has the same token. Only a reviewer sees real values, and every try is in the audit log.

```bash
bun test tests/promises/37.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Keep the vault in an encrypted store with its own access list. Let your identity system say who is a reviewer. Never log the real values.

## Read the code

Open `labs/37-phi-vault.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
