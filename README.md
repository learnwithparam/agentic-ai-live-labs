# Agentic AI Live Labs

Four small labs on one problem: answering a doctor's drug question safely. Plain TypeScript, run with Bun, no install of any AI library and no API key.

All drugs, doctors and documents are invented.

## Start

```bash
bun install
bun test
```

Expect: `15 pass`

## The model is a stand-in

Every lab calls `callLlm` in `src/model.ts`. It is a small rule-based model, so the labs run offline and give the same answer every time. It can behave three ways with `--model`:

- `ok`: follows the rules (default).
- `nocite`: gives a right answer but forgets the citation.
- `invent`: cites a real document but states a wrong dose.

The loop only needs a function that takes messages and returns a tool call or text. Replace `makeModel` with a call to a real provider and the labs do not change.

## The labs

Each lab runs once with `--question`, or asks you again and again if you leave it out. Press Enter on an empty line to quit.

### Lab 1: the agent loop

```bash
bun labs/01-agent-loop.ts --question "What is the dose of Cardioza?"
bun labs/01-agent-loop.ts --question "What is the dose of Cardioza?" --country DE
bun labs/01-agent-loop.ts --question "Is Zorbex safe for children?"
bun labs/01-agent-loop.ts
```

Expect: each step printed, then `ANSWER:` with a `[DOC-...]` citation, or `I found no approved source`. Germany gets 5mg, the US gets 10mg.

### Lab 2: guardrails and PHI redaction

```bash
bun labs/02-guardrails.ts --question "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) on Cardioza"
bun labs/02-guardrails.ts --question "Cardioza dose" --model nocite
```

Expect: the note before and after masking (`[SSN]`, `[PHONE]`, `Patient: [NAME]`), then `OUTPUT GUARDRAIL: passed` or `BLOCKED: no approved source citation.`

### Lab 3: the first gates

```bash
bun labs/03-gates.ts
bun labs/03-gates.ts --question "Zorbex dose" --approve n
bun labs/03-gates.ts --question "Cardioza dose" --model nocite --approve y
```

Expect: gate 1 for a question with no approved document, gate 2 for a reply with no citation. Without `--approve` you type `y` or `n` at the review.

### Lab 4: workflow, one agent, multi-agent

```bash
bun labs/04-shapes.ts --shape workflow --hcp H-2 --question x
bun labs/04-shapes.ts --shape agent --hcp H-3 --question "Neurovex dose"
bun labs/04-shapes.ts --shape multi --question "Cardioza dose"
bun labs/04-shapes.ts --shape multi --model invent --question "Cardioza dose" --approve n
```

Expect: the workflow prints the joined doctor record with no model call. The agent picks three tools in turn. In multi mode, `--model invent` makes the auditor fail the draft and the run ends `REJECTED_BY_COMPLIANCE`, even though the wrong dose carries a valid citation, so the citation check alone would have let it out.

Doctors: `H-1` (US cardiology), `H-2` (DE cardiology), `H-3` (US neurology).

## Where things live

- `src/loop.ts`: the agent loop and the tool allowlist.
- `src/guardrails.ts`: redaction and the citation check.
- `src/gate.ts` and `src/inquiry.ts`: the human gates and the full path for one question.
- `src/shapes.ts`: the three shapes.
- `src/data.ts`: the invented documents, doctors and emails.

## What this does not do

- Redaction is pattern based. It catches the formats it lists and nothing else, so a real system needs more.
- The auditor checks each cited sentence word for word against its document. A real auditor would be a second model.
