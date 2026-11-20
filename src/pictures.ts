// One picture per lab. Each picture tells the story of the lab in a few boxes.
// The lab pages in docs/labs/ show these pictures. Keys are concept names, such as "agent-loop".
// Read a picture from the top, or from the left. Each box is one step of the story.
// bun scripts/readme.ts --write puts each picture on its page. bun run check fails if one is missing.

export const PICTURES: Record<string, string> = {
  "agent-loop": `flowchart LR
  A["Doctor asks a question"] --> B["Model asks for a search"]
  B --> C["Our code runs the search"]
  C --> D["Model reads the result"]
  D -->|"needs more"| B
  D --> E["Answer with a source"]`,

  guardrails: `flowchart LR
  A["Doctor's note with names"] --> B["Hide private details"]
  B --> C["Model reads safe text"]
  C --> D{"Reply has a source?"}
  D -->|"Yes"| E["Send reply"]
  D -->|"No"| F["Block reply"]`,

  gates: `flowchart LR
  A["Agent drafts a reply"] --> B{"Is the agent sure?"}
  B -->|"Yes"| C["Send"]
  B -->|"No"| D["Stop and ask a person"]
  D --> E{"Person says yes?"}
  E -->|"Yes"| C
  E -->|"No"| F["Drop it"]`,

  shapes: `flowchart TB
  A1["Workflow: fixed steps"] --> A2["Step 1"] --> A3["Step 2"] --> A4["Step 3"]
  B1["One agent: picks its tools"] --> B2["Loop until done"]
  C1["Many agents: pass work on"] --> C2["Writer"] --> C3["Checker"]`,

  "tool-schemas": `flowchart LR
  A["Model asks for a tool"] --> B{"Matches the schema?"}
  B -->|"Yes"| C["Run the tool"]
  B -->|"Small fix"| D["Repair the input"]
  D --> C
  B -->|"No"| E["Reject and say why"]`,

  "shell-tool": `flowchart LR
  A["Agent wants a command"] --> B{"On the allow-list?"}
  B -->|"No"| X["Refuse"]
  B -->|"Yes"| C{"Inside the fixed folder?"}
  C -->|"No"| X
  C -->|"Yes"| D["Run with a time limit"]`,

  "mcp-basics": `flowchart LR
  A["Our agent"] -->|"what tools do you have?"| B["MCP server"]
  B -->|"list of tools"| A
  A -->|"call one tool"| B
  B -->|"result"| A`,

  "mcp-trust": `flowchart LR
  A["Server sends its tools"] --> B{"Server approved?"}
  B -->|"No"| X["Ignore the server"]
  B -->|"Yes"| C{"Same fingerprint as before?"}
  C -->|"Yes"| D["Load the tool"]
  C -->|"No, it changed"| Y["Stop and review"]`,

  "three-doors": `flowchart LR
  Job["One job: find a dose"] --> F["Door 1: a function"]
  Job --> S["Door 2: a command"]
  Job --> M["Door 3: an MCP server"]
  F --> R["Same answer, compare risk"]
  S --> R
  M --> R`,

  "context-budget": `flowchart LR
  A["Big result: mail, calls, contract"] --> B["Save in full on disk"]
  B --> C["One-line receipt in the prompt"]
  C --> D{"Over 40 percent of the window?"}
  D -->|"Yes"| E["Fold old phases into notes"]
  D -->|"No"| F["Keep going"]
  E --> G["Read back only the file the question needs"]
  F --> G`,

  "history-trimming": `flowchart LR
  A["Client message"] --> B["Fill the brief: budget, deadline, scope, contact"]
  A --> C["Old messages"]
  C --> D["Trim"]
  B --> E["Prompt: the brief and the last four messages"]
  D --> E`,

  retrieval: `flowchart LR
  A["Question"] --> B["Find matching passages"]
  B --> C["Rank the best few"]
  C --> D["Model answers and cites them"]`,

  "pick-context": `flowchart LR
  A["Question"] --> B{"Rule: right country and topic?"}
  B -->|"Yes"| C["Load this document"]
  B -->|"No"| D["Never loaded"]
  C --> E["Model sees only allowed text"]`,

  "instructions-vs-data": `flowchart LR
  A["Mail from outside"] --> F["Wrapped as data"]
  F --> R["Reader with no tools: facts"]
  R --> G{"Guard score"}
  G -->|"High"| H["Held for Maya"]
  G -->|"Off the job"| N["Polite no"]
  G -->|"Low"| T["Actor picks an action"]
  T --> S["Tool: never outside the company"]`,

  "stop-conditions": `flowchart LR
  A["Loop runs a step"] --> B{"Done?"}
  B -->|"Yes"| Z["Stop: answer"]
  B -->|"No"| C{"Step cap reached?"}
  C -->|"Yes"| Y["Stop: too many steps"]
  C -->|"No"| D{"Same call again and again?"}
  D -->|"Yes"| Y
  D -->|"No"| A`,

  "error-feedback": `flowchart LR
  A["Filing call has a wrong category"] --> B["API names the allowed ones"]
  B --> C["Model tries again"]
  C --> D{"Fixed, within the retry limit?"}
  D -->|"Yes"| E["Done"]
  D -->|"No"| F["Ask a person"]`,

  "plan-then-act": `flowchart LR
  A["Maya: prep me for the board"] --> P["Bot writes the whole plan"]
  P --> B{"Plan is safe?"}
  B -->|"No"| X["Run nothing"]
  B -->|"Books a room"| W["Maya approves first"]
  B -->|"Yes"| C["Run each step in order"]
  W --> C`,

  "reflect-and-fix": `flowchart LR
  A["Writer drafts"] --> B["Critic checks the draft"]
  B -->|"Passes"| D["Person decides"]
  B -->|"Fails"| C["Writer fixes it"]
  C --> B`,

  "run-state": `flowchart LR
  A["Screening starts: open the record"] --> B["Each applicant saved to disk"]
  B --> C["All done"]
  B -->|"Two fails on one applicant"| E["Stop and ask a person"]
  B -->|"Program restarts"| R["Read the record, skip done ones"]
  B -->|"No news for too long"| D["Flag: stalled"]`,

  "tool-failures": `flowchart LR
  A["Send the follow-up"] --> B{"What came back?"}
  B -->|"Sent"| C["Done"]
  B -->|"Bounced: a clear no"| X["Stop, never retry"]
  B -->|"429, slow or down"| D{"Tries left?"}
  D -->|"Yes: wait, then retry"| A
  D -->|"No"| E["Keep the lead for later"]`,

  "crash-and-resume": `flowchart LR
  A["Job: 40 follow-up emails"] --> B["Send one email"]
  B --> C["Write it in the ledger"]
  C -->|"crash here"| D["Restart"]
  D --> E["Read the ledger"]
  E --> F["Skip what was sent"]
  F --> G["Finish the rest"]`,

  budgets: `flowchart LR
  A["Each model call"] --> B["Add its cost"]
  B --> C{"Over the cap?"}
  C -->|"No"| D["Call again"]
  C -->|"Yes"| E["Stop the run"]`,

  "model-routing": `flowchart LR
  A["500 emails"] --> B["Small model sorts them"]
  B --> C["Small model drafts the reply"]
  C --> E{"Check passes?"}
  E -->|"No, twice"| D["Strong model drafts it"]
  E -->|"Yes"| F["Send"]
  D --> F`,

  "identity-and-scopes": `flowchart LR
  A["Bot asks to act"] --> B["Check its signed token"]
  B -->|"Bad or expired"| X["Refuse"]
  B -->|"Good"| C{"Tool in its scope?"}
  C -->|"Yes"| D["Run the tool"]
  C -->|"No"| X`,

  "act-for-user": `flowchart LR
  A["Maya signs in"] --> B["Bot gets a draft-only token"]
  B --> C{"Token holds the scope?"}
  C -->|"Yes, draft"| D["Bot saves a draft"]
  C -->|"No, send"| E["Bot refuses, even if an email says so"]`,

  hooks: `flowchart LR
  A["Agent wants to send an email"] --> B["Before hook checks it"]
  B -->|"Clean"| C["Send the email"]
  C --> D["After hook checks what left"]
  B -->|"Dirty"| X["Block the call"]`,

  "traces-and-audit": `flowchart LR
  A["Record 1"] -->|"fingerprint"| B["Record 2"]
  B -->|"fingerprint"| C["Record 3"]
  C --> D{"Any line changed?"}
  D -->|"Yes"| X["Checker catches the edit"]
  D -->|"No"| OK["Trace is intact"]`,

  "evals-and-release": `flowchart LR
  A["New version"] --> B["Run the eval set"]
  B --> C{"Every check passes?"}
  C -->|"Yes"| D["Ship"]
  C -->|"No"| E["Block the release"]`,

  routing: `flowchart LR
  A["Request comes in"] --> B{"What kind?"}
  B -->|"Drug dose"| C["Dose specialist"]
  B -->|"Email draft"| D["Writing specialist"]
  B -->|"Other"| E["General helper"]`,

  "chain-and-delegate": `flowchart LR
  A["Receipt"] --> B["Match a bank line"]
  B -->|"No match"| P["A person looks"]
  B -->|"Match"| C["Pick a label"]
  C --> D["File it"]
  A -->|"hand each receipt to"| W["Worker"]
  W --> B`,

  "parallel-workers": `flowchart LR
  A["Pitch research"] --> W1["Site"]
  A --> W2["Social"]
  A --> W3["Pricing"]
  A --> W4["Clients"]
  W1 --> M["One writer merges"]
  W2 --> M
  W3 --> M
  W4 --> M`,

  "subagent-isolation": `flowchart LR
  A["Main agent: clean context"] -->|"40 CI logs"| S["Subagent with its own context"]
  S -->|"only 5 lines"| A`,

  handoffs: `flowchart LR
  A["Inbox bot reads the mail"] --> B["Expense bot files the receipt"]
  B --> C["Reply bot writes back"]
  C --> D{"Hops left?"}
  D -->|"Yes"| A
  D -->|"No"| X["Stop: hop limit"]`,

  "shared-memory": `flowchart LR
  A["A note is offered"] --> B{"Writer on the team, no address?"}
  B -->|"Yes"| C["Shared memory"]
  B -->|"No"| X["Keep it out"]
  C --> D["Inbox, expense and triage bots read it"]`,

  "wakeups-and-board": `flowchart LR
  A["9am timer or GitHub issue"] --> B{"Key already on the board?"}
  B -->|"No"| C["Bot does its job"]
  B -->|"Yes"| X["Skip it"]
  C --> D["Card: done, waiting or failed"]
  D --> E["Maya's yes wakes the run"]`,

  "hcp-360": `flowchart LR
  A["CRM"] --> M["Match by NPI number"]
  B["Claims"] --> M
  C["Events"] --> M
  D["Email log"] --> M
  M --> P["One profile per doctor"]
  P --> O["One message, no repeats"]`,

  "phi-vault": `flowchart LR
  A["Note with a real name"] --> B["Swap the name for a token"]
  B --> C["Model sees only the token"]
  C --> D{"Reviewer approves?"}
  D -->|"Yes"| E["Vault puts the name back"]
  D -->|"No"| F["Token stays"]`,

  "fact-checker": `flowchart LR
  A["Draft"] --> B["Split into sentences"]
  B --> C{"Each one has an approved source?"}
  C -->|"Yes"| D["Keep"]
  C -->|"No"| E["Block the draft"]`,

  revocation: `flowchart LR
  A["Document withdrawn in a country"] --> B["Mark it revoked"]
  B --> C["Search skips it"]
  B --> D["Cache drops it"]
  C --> E["Doctor never sees it"]
  D --> E`,

  "end-to-end": `flowchart LR
  A["Doctor's note"] --> B["Hide private details"]
  B --> C["Search approved sources"]
  C --> D["Model drafts a reply"]
  D --> E["Claim checker"]
  E --> F{"Every guard passed?"}
  F -->|"Yes"| G["Send and record it"]
  F -->|"No"| H["Hold for a person"]`,
};
