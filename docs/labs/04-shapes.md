# Lab 4: three ways to build one job

Three ways to build the same helper. Pick the shape with --shape workflow, agent or multi. Pick the doctor with --hcp H-1 (US), H-2 (Germany) or H-3 (US neurology).

## The problem

One agent has no second pair of eyes. It can write a wrong dose, cite a real document, and nothing stops it.

## New words

workflow = fixed steps in plain code. agent = a model that picks its own tools. many agents = several models, each with one job. auditor = a model that only checks another model's work.

## Run it

Copy any line into your terminal. Each one is a real example from this lab.

```bash
bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape agent --hcp H-1 --model invent
bun labs/04-shapes.ts --question "What do we know about this doctor?" --shape workflow --hcp H-2
bun labs/04-shapes.ts --question "What do we know about this doctor?" --shape workflow --hcp H-9
bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape agent --hcp H-1
bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape agent --hcp H-2
bun labs/04-shapes.ts --question "What is the dose of Zorbex?" --shape agent --hcp H-3
bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape multi --hcp H-1
bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape multi --hcp H-1 --model invent --approve n
bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape multi --hcp H-1 --model invent --approve y
bun labs/04-shapes.ts --question "What is the dose of Zorbex?" --shape multi --hcp H-1 --approve n
bun labs/04-shapes.ts --demo
```

Run `bun labs/04-shapes.ts` with nothing else to pick an example from a menu.

## The cases

Case 1 is the naive way. Read what goes wrong, then read the rest.

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | NAIVE: one agent, and nothing checks it | The model writes a wrong dose and cites the real document. One agent has no second pair of eyes, so the wrong dose goes out. | answered | `bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape agent --hcp H-1 --model invent` |
| 2 | Workflow: join a doctor's records | No model needed to combine the CRM profile, recent emails and the documents this doctor's country allows. | joined | `bun labs/04-shapes.ts --question "What do we know about this doctor?" --shape workflow --hcp H-2` |
| 3 | Workflow: a doctor we do not know | Plain code handles missing data the same way every time. No profile means no allowed documents. | joined | `bun labs/04-shapes.ts --question "What do we know about this doctor?" --shape workflow --hcp H-9` |
| 4 | One agent: three tools in turn | The model looks up the profile, searches approved documents, then checks recent outreach before it answers. | answered | `bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape agent --hcp H-1` |
| 5 | One agent: a doctor with no recent outreach | Same agent, different doctor. Dr. Weber has no emails, and gets the German dose. | answered | `bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape agent --hcp H-2` |
| 6 | One agent: no approved document | The agent refuses to guess, but nothing double checks it. That is the gap multi-agent fills. | no-source | `bun labs/04-shapes.ts --question "What is the dose of Zorbex?" --shape agent --hcp H-3` |
| 7 | Multi-agent: auditor passes a true draft | The researcher drafts. The auditor finds every cited sentence in its document word for word. No person is needed. | passed | `bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape multi --hcp H-1` |
| 8 | Multi-agent: auditor catches a wrong dose | The draft says 20mg and cites the real document, so lab 2's citation check passed it. The auditor compares the claim to the source and fails it. A person rejects it. | rejected | `bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape multi --hcp H-1 --model invent --approve n` |
| 9 | Multi-agent: a person overrides | Same wrong draft, but the reviewer says yes. The gate is only as good as the person behind it. | approved by person | `bun labs/04-shapes.ts --question "What is the dose of Cardioza?" --shape multi --hcp H-1 --model invent --approve y` |
| 10 | Multi-agent: nothing to audit | The researcher finds no source, so the draft has no cited claim. The auditor fails it and a person decides. | rejected | `bun labs/04-shapes.ts --question "What is the dose of Zorbex?" --shape multi --hcp H-1 --approve n` |

## The promise, and its test

Pick the simplest shape that does the job. When a wrong answer is costly, a second agent checks it and a person decides on any doubt.

```bash
bun test tests/promises/04.test.ts
```

To see the test do its job, break the rule in PART 1 on purpose. The test must fail. Then undo it.

## In production

Use a workflow when the steps never change. Add an agent only where the path must change. Add an auditor where a mistake would cost real money or safety.

## Read the code

Open `labs/04-shapes.ts`. Read the code from the top. It holds only the lesson.
The screen output is in `show/`. You do not need it to learn.
