# The agent loop

Each example is one question about a drug. The model asks for a tool, our code runs it, and the model reads the result. Each trip round the loop is one step. The only source of facts is the approved document search.

## The story in one picture

```mermaid
flowchart LR
  A["Doctor asks a question"] --> B["Model asks for a search"]
  B --> C["Our code runs the search"]
  C --> D["Model reads the result"]
  D -->|"needs more"| B
  D --> E["Answer with a source"]
```

## The problem

A model's memory can be wrong or old. It needs a tool that looks up the approved facts.

## New words

Each word has one meaning in every lab.

- **loop**: The model asks for a tool, the code runs it, and the model reads the result.
- **tool**: A function the model may ask our code to run, such as a search.
- **step**: One trip round the loop: the model acts, then the code reacts.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun run lab agent-loop --question "What is the dose of Cardioza?"
bun run lab agent-loop --question "What is the dose of Cardioza?" --country DE
bun run lab agent-loop --question "Can you tell me the CARDIOZA dose please?"
bun run lab agent-loop --question "What is the dose of Cardioza and Neurovex?"
bun run lab agent-loop --question "Is Zorbex safe for children?"
bun run lab agent-loop --question "What is the dose of Dermalin?" --country DE
bun run lab agent-loop --question "What is the dose of Cardiozza?"
bun run lab agent-loop --question "Hi there, how are you doing today?"
bun run lab agent-loop --question "What is the dose of Cardioza?" --steps 1
bun run lab agent-loop --demo
```

Run `bun run lab agent-loop` with nothing else to pick an example from a menu.

## The cases

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | A normal question | The happy path. One search, then an answer that cites its source. | answered | `bun run lab agent-loop --question "What is the dose of Cardioza?"` |
| 2 | Same question, different country | Approved text differs by country. Germany gets 5mg and the US gets 10mg. The tool filters by country, so the model cannot override it. | answered | `bun run lab agent-loop --question "What is the dose of Cardioza?" --country DE` |
| 3 | Capital letters | Search ignores case, so shouting the drug name still works. | answered | `bun run lab agent-loop --question "Can you tell me the CARDIOZA dose please?"` |
| 4 | Two drugs in one question | One search can return two documents. The answer must cite both. | answered | `bun run lab agent-loop --question "What is the dose of Cardioza and Neurovex?"` |
| 5 | A drug we have no document for | The search finds nothing, so the model must refuse. It must not guess from memory. | no-source | `bun run lab agent-loop --question "Is Zorbex safe for children?"` |
| 6 | Approved in another country only | Dermalin is approved in the US only. A German doctor gets no answer. That is the right behaviour. | no-source | `bun run lab agent-loop --question "What is the dose of Dermalin?" --country DE` |
| 7 | A spelling mistake | Search needs the exact drug name. A typo finds nothing. A real system would match close spellings or ask the doctor to confirm. | no-source | `bun run lab agent-loop --question "What is the dose of Cardiozza?"` |
| 8 | Not a drug question at all | Small talk has no approved source. The loop still ends safely. | no-source | `bun run lab agent-loop --question "Hi there, how are you doing today?"` |
| 9 | The loop hits its step limit | We allow only 1 step. The model gets one tool call and no turn left to answer. A step limit stops a model that never finishes. | stopped | `bun run lab agent-loop --question "What is the dose of Cardioza?" --steps 1` |

## Stuck points

**Correct run:** Run the search, read the result, then answer with its document id.

**Common wrong turn:** Expecting the model to answer from memory. It has no approved facts there, so it guesses or refuses.

**Hint to give:** Which step gives the model its facts? Find that line in the code.

| What you see | What it means | Fix |
| --- | --- | --- |
| The demo prints outcome: stopped on the step-limit case | The loop hit its step limit before the model answered | Find the step where the model never finishes, or raise --steps |
| The demo prints outcome: no-source | The search found no approved document | Check the drug name and the country. Refusing is correct |
| The log shows STOPPED after several rounds | The model asked for a tool every round | Read the log. Each round should bring new information |

## Read the code

Open `labs/01-agent-loop.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
