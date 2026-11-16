# Lab 4: workflow, one agent, multi-agent

Three ways to build the same helper. Pick the shape with --shape workflow, agent or multi, and the doctor with --hcp H-1 (US), H-2 (Germany) or H-3 (US neurology).

## Run it

```bash
bun run lab 4          # a menu: pick an example
bun run lab 4 --demo   # every case, each with its reason
```

## The cases

| # | Case | Why it matters | Result | Run it alone |
| --- | --- | --- | --- | --- |
| 1 | Workflow: join a doctor's records | No model needed to combine the CRM profile, recent emails and the documents this doctor's country allows. | `joined` | `bun run lab 4 --question "(not used by a workflow)" --shape workflow --hcp H-2` |
| 2 | Workflow: a doctor we do not know | Plain code handles missing data the same way every time. No profile means no allowed documents. | `joined` | `bun run lab 4 --question "(not used by a workflow)" --shape workflow --hcp H-9` |
| 3 | One agent: three tools in turn | The model looks up the profile, searches approved documents, then checks recent outreach before it answers. | `answered` | `bun run lab 4 --question "Cardioza dose" --shape agent --hcp H-1` |
| 4 | One agent: a doctor with no recent outreach | Same agent, different doctor. Dr. Weber has no emails, and gets the German dose. | `answered` | `bun run lab 4 --question "Cardioza dose" --shape agent --hcp H-2` |
| 5 | One agent: no approved document | The agent refuses to guess, but nothing double checks it. That is the gap multi-agent fills. | `no-source` | `bun run lab 4 --question "Zorbex dose" --shape agent --hcp H-3` |
| 6 | Multi-agent: auditor passes a true draft | The researcher drafts. The auditor finds every cited sentence in its document word for word. No person is needed. | `passed` | `bun run lab 4 --question "Cardioza dose" --shape multi --hcp H-1` |
| 7 | Multi-agent: auditor catches a wrong dose | The draft says 20mg and cites the real document, so lab 2's citation check passed it. The auditor compares the claim to the source and fails it. A person rejects it. | `rejected` | `bun run lab 4 --question "Cardioza dose" --shape multi --hcp H-1 --model invent --approve n` |
| 8 | Multi-agent: a person overrides | Same wrong draft, but the reviewer says yes. The gate is only as good as the person behind it. | `approved by person` | `bun run lab 4 --question "Cardioza dose" --shape multi --hcp H-1 --model invent --approve y` |
| 9 | Multi-agent: nothing to audit | The researcher finds no source, so the draft has no cited claim. The auditor fails it and a person decides. | `rejected` | `bun run lab 4 --question "Zorbex dose" --shape multi --hcp H-1 --approve n` |

## Read the code

Open `labs/04-shapes.ts`. Read PART 1 only. It is the whole idea.
PART 2 only draws the colours, so skip it.
