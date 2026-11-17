// STUCK POINTS. What a learner does wrong, and what to check, for every lab.
// Each lab page shows these in the teach format.
// It has a correct run, a common wrong turn, a hint to give, and a table: what you see, what it means, the fix.
// bun run stuck checks that each entry is complete, and that every outcome it names is real.

export type Stuck = {
  correct: string; // what a correct run does
  wrong: string;   // the common wrong turn
  hint: string;    // a question that points to the answer, without giving it
  rows: [string, string, string][]; // [what you see, what it means, fix]
};

export const STUCK: Record<string, Stuck> = {
  "agent-loop": {
    correct: "Run the search, read the result, then answer with its document id.",
    wrong: "Expecting the model to answer from memory. It has no approved facts there, so it guesses or refuses.",
    hint: "Which step gives the model its facts? Find that line in the code.",
    rows: [
      ["The demo prints outcome: stopped on the step-limit case", "The loop hit its step limit before the model answered", "Find the step where the model never finishes, or raise --steps"],
      ["The demo prints outcome: no-source", "The search found no approved document", "Check the drug name and the country. Refusing is correct"],
      ["The log shows STOPPED after several rounds", "The model asked for a tool every round", "Read the log. Each round should bring new information"],
    ],
  },
  guardrails: {
    correct: "Hide the private details before the model reads them. The demo prints 3 masked, passed.",
    wrong: "Checking only the reply. The model has already read the private details, so they can leak in its words.",
    hint: "Which text does the model read first: the raw note or the hidden note?",
    rows: [
      ["The demo prints outcome: leaked 3 on the NAIVE case", "The raw note reached the model", "Run the input guardrail before the model is called"],
      ["A private detail appears in the reply", "The output guardrail did not catch it", "Add the pattern to the rules, and check the output too"],
      ["A name with no label is not hidden", "The name finder did not see it", "Check the name finder for this kind of name"],
    ],
  },
  gates: {
    correct: "Stop the run at the gate. A person says yes or no, and the demo prints the outcome.",
    wrong: "Treating a missing answer as yes. With no answer the gate says no, so the reply is blocked.",
    hint: "What should happen if nobody answers? Which way should the default go?",
    rows: [
      ["The demo prints outcome: SENT_UNCHECKED on the NAIVE case", "No gate ran, so the uncited reply was sent", "Add a gate before every send that may be wrong"],
      ["The gate prints a box with Reason and Draft", "The person sees what the model wrote", "Read the reason first, then approve or reject"],
      ["A reply is sent with --approve y and no one read it", "The answer was typed in advance, not read", "Use a real person's answer for the gate"],
    ],
  },
  shapes: {
    correct: "Pick the simplest shape that works. Use a workflow for fixed steps, and an auditor when a mistake is costly.",
    wrong: "Building many agents for a job that a fixed workflow does. Each extra agent adds cost and places for mistakes.",
    hint: "Do the steps ever change? If not, what does an agent add?",
    rows: [
      ["The demo prints outcome: answered on the NAIVE case", "One agent wrote a wrong dose, and nothing checked it", "Add an auditor, or move to many agents"],
      ["The workflow answers with no model call", "Plain code did the work", "Use a workflow when the steps never change"],
      ["A doctor with no document gets no-source", "The agent refused, and nothing double checked it", "This is correct. Refusing is safe"],
    ],
  },
  "tool-schemas": {
    correct: "The schema checks each call first, and a bad call is rejected. A fixable call is repaired and noted.",
    wrong: "Trusting the model's text. A lower case country finds nothing, and nobody is told why.",
    hint: "Which field does the schema expect, and what did the model write instead?",
    rows: [
      ["The demo prints outcome: silent-miss on the NAIVE case", "The search quietly found nothing", "Check every call against the schema before the tool runs"],
      ["A note says a field was changed", "The fix was made and noted", "Read the note. It shows what the schema changed"],
      ["A call with an unknown field still runs", "The schema did not reject the extra field", "Drop or reject any field the schema does not know"],
    ],
  },
  "shell-tool": {
    correct: "Only allow-listed commands run, inside the sandbox folder. Anything else is refused before it starts.",
    wrong: "Trusting the model to stay in the folder. A shell obeys a path that climbs out, and reads files outside.",
    hint: "Which rule would stop a command that leaves the sandbox?",
    rows: [
      ["The demo prints outcome: escaped on the NAIVE case", "The command ran outside the sandbox", "Check the real path of each file against the folder"],
      ["The demo prints outcome: refused", "The command is not on the allow-list", "This is correct. Do not add rm to the list"],
      ["A command runs when the list is empty", "The allow-list check was skipped", "Run the allow-list check first, before anything starts"],
    ],
  },
  "mcp-basics": {
    correct: "The agent asks the server for its tools when it starts, then calls them. Nothing is copied into the code.",
    wrong: "Copying the tool list into the code. New server tools are then never used, and nobody gets an error.",
    hint: "Where should the agent learn its tool list from?",
    rows: [
      ["The demo prints outcome: out-of-date on the NAIVE case", "The agent used a list copied from the server", "Ask the server for its tools when the agent starts"],
      ["The result is marked as an error", "The server reported a failure, such as an unknown doctor", "Read the error text, then fix the input"],
      ["The server runs but no tools appear", "The client never asked for the tool list", "Ask for the list first, then call a tool"],
    ],
  },
  "mcp-trust": {
    correct: "Load only tools that are approved and match their pin. Anything new, changed or unapproved is held back.",
    wrong: "Trusting every description. A server can hide an order inside a tool description.",
    hint: "What changed since the pin was saved? Compare the fingerprint.",
    rows: [
      ["The demo prints outcome: poisoned on the NAIVE case", "The hidden order reached the prompt", "Check each tool's fingerprint against its pin before loading"],
      ["A tool is held with the outcome changed", "Its fingerprint no longer matches the pin", "A person must review it and approve it again"],
      ["A server is blocked before its tools are read", "The server is not on the approved list", "Add it to the list only after a review"],
    ],
  },
  "three-doors": {
    correct: "Run the same lookup through each door. Compare the time, and whether the answer can be cited.",
    wrong: "Using the shell door for everything. Its answer has no document id, so it cannot be checked.",
    hint: "Which door gives an answer that the output check can read?",
    rows: [
      ["The demo prints outcome: uncited on the NAIVE case", "The shell answer has no document id", "Use the function or MCP door when the answer must be cited"],
      ["The MCP door is slower", "A server has to start first", "This is the cost of MCP. Use it when a second team needs the tool"],
      ["The shell door reads the wrong country", "It filters by hand, not in the tool", "Move the country rule into the tool itself"],
    ],
  },
  "context-budget": {
    correct: "Count each part, keep the must parts, and cut the least useful part first. The demo prints what was dropped.",
    wrong: "Letting the window cut from the top. The rules are the oldest text, so they are lost first.",
    hint: "Which part does the model need most? Keep that one.",
    rows: [
      ["The demo prints outcome: rules-lost on the NAIVE case", "The oldest text, the rules, was cut", "Keep the rules and the question as must parts"],
      ["The demo prints outcome: too-small", "The must parts do not fit the budget", "Raise the window, or shorten the note. Never send without the rules"],
      ["The reply is a refusal", "The documents were cut, so there is no source", "This is safe. Refusing beats guessing"],
    ],
  },
  "history-trimming": {
    correct: "Keep the pinned facts and the most recent turns, in order. Everything else is cut.",
    wrong: "Keeping only the last turns. The country from the first turn is cut, so the agent forgets it.",
    hint: "Which fact must survive, however old its turn is?",
    rows: [
      ["The demo prints outcome: fact-lost on the NAIVE case", "The pinned fact was cut with the old turns", "Pin the country and the allergy before trimming"],
      ["The demo prints outcome: nothing-to-trim", "The chat fits within the limit", "This is correct. No trim is needed"],
      ["Facts-only keeps no recent turns", "Zero recent turns were kept, on purpose", "This is correct for the facts-only case"],
    ],
  },
  retrieval: {
    correct: "Search only the doctor's country, score the chunks, and return the strong ones. Say so when none are strong.",
    wrong: "Searching all countries. The best match may come from another country, which gives the wrong dose.",
    hint: "Which filter must run before the score?",
    rows: [
      ["The demo prints outcome: wrong-country on the NAIVE case", "A chunk from another country was returned", "Filter by country before ranking"],
      ["The demo prints outcome: no-source", "No chunk has a strong score for this country", "This is correct. Say there is no source"],
      ["Two chunks tie on score", "The score cannot pick one", "Sort ties in a fixed order, so the answer never changes"],
    ],
  },
  "pick-context": {
    correct: "Load only the sources that the question's keywords need. A question with no keyword loads nothing.",
    wrong: "Loading every source. The model then sees private emails that the question did not need.",
    hint: "Which source does a dose question need, and which one does it not?",
    rows: [
      ["The demo prints outcome: overloaded on the NAIVE case", "Every source was loaded, emails included", "Load a source only when a keyword asks for it"],
      ["The agent asks for more context", "No keyword matched, so nothing was loaded", "This is correct. Ask the person which source they need"],
      ["The profile appears in a dose answer", "The profile was loaded with no reason", "Check the keyword rule for that source"],
    ],
  },
  "instructions-vs-data": {
    correct: "Put each document inside a data fence. A line with an order is held out of the prompt.",
    wrong: "Pasting the document next to the rules. The hidden order looks like a rule, so the model may obey it.",
    hint: "Can the data close its own fence, or can only our code do that?",
    rows: [
      ["The demo prints outcome: obeyed on the NAIVE case", "The hidden order reached the model as a rule", "Fence each document, and scan it for orders first"],
      ["A line is marked held", "The line held an order, so it was kept out", "This is correct. Check the held line by hand"],
      ["A closing fence tag appears inside the data", "The data tried to close its own fence", "Drop the tag from inside the data"],
    ],
  },
  "stop-conditions": {
    correct: "Stop at the first limit reached, whether a step, a repeat or the budget. The run says why it stopped.",
    wrong: "Trusting the model to stop. A stuck model repeats one call and never says it is done.",
    hint: "Which limit would stop this loop, and when?",
    rows: [
      ["The demo prints outcome: never-stopped on the NAIVE case", "No limit of our own was set", "Set a step limit, a repeat limit and a budget"],
      ["The run prints a stop reason", "A limit was hit before the answer", "Read the reason. Raise a limit only if the task needs it"],
      ["The same call repeats with --model stuck", "The repeat limit was not reached in time", "Lower --repeats so the stuck call stops sooner"],
    ],
  },
  "error-feedback": {
    correct: "Return an error that says what is valid, so the model can fix its call. A call that cannot be fixed goes to a person.",
    wrong: "Returning a bare ERROR. The model repeats the same call until it runs out of tries.",
    hint: "What would the model need to read to change its call?",
    rows: [
      ["The demo prints outcome: gave-up on the NAIVE case", "The same call was sent three times", "Send the valid countries in the error text"],
      ["The model fixed its call, and the tool ran", "The error said what was wrong", "This is correct. The hint did its job"],
      ["A retry never stops", "The retry cap is missing", "Cap the retries, then ask a person"],
    ],
  },
  "plan-then-act": {
    correct: "Check the whole plan before any step runs. A risky step waits for a person, and a failed step stops the rest.",
    wrong: "Running each step as it is written. The email goes out before anyone sees the plan was wrong.",
    hint: "Which step can never be undone? Should it run before a person checks?",
    rows: [
      ["The demo prints outcome: ran-unchecked on the NAIVE case", "The plan ran with no check", "Check the plan before the first step"],
      ["The run waits at a risky step", "The step cannot be undone, so a person decides", "Approve the step, or stop the plan"],
      ["The plan stops at one step", "A failed step stops the rest", "This is correct. Fix that step, then run again"],
    ],
  },
  "reflect-and-fix": {
    correct: "Check each draft in code against the source. A fix gets two rounds at most, then a person decides.",
    wrong: "Asking the model if its draft is fine. It has no new facts, so it says yes.",
    hint: "What can code check that the model cannot judge by itself?",
    rows: [
      ["The demo prints outcome: self-approved on the NAIVE case", "The model approved its own wrong dose", "Check the dose and the citation in code, not with the model"],
      ["The log shows round 1, round 2, then a person", "The fix limit was reached", "This is correct. A person decides when the fixes fail"],
      ["A draft with no source is passed", "The check had no source to compare with", "With no source, stop and ask. Do not pass it"],
    ],
  },
  "run-state": {
    correct: "Write the run record before the first step, and save it after each step. Read it back from disk to check it.",
    wrong: "Keeping only a printed log. When the program ends, nothing is left to read.",
    hint: "What could someone read after the program has stopped?",
    rows: [
      ["The demo prints outcome: no-record on the NAIVE case", "Nothing was saved to disk", "Save the record to disk after each step"],
      ["The run shows as stalled", "No step finished for too long", "Check the step that is waiting, and restart it"],
      ["A failed run has no reason", "The reason was not saved", "Save the reason with the failed status"],
    ],
  },
  "tool-failures": {
    correct: "Stop each call at its timeout. Retry a transient failure with a growing backoff, but never retry a no.",
    wrong: "One try with no time limit. It hangs on a slow service, and gives up on the first flaky error.",
    hint: "Which failure is worth another try, and which one is a clear no?",
    rows: [
      ["The demo prints outcome: unavailable on the NAIVE case", "One try gave up on a flaky error", "Retry transient failures with a backoff"],
      ["A call stops at the time limit", "The service was too slow", "This is correct. Raise the timeout only with a reason"],
      ["The same no is sent again and again", "A no was retried", "Stop retrying a no at once"],
    ],
  },
  "crash-and-resume": {
    correct: "Record each finished step in the ledger. After a kill, restart from the ledger and skip what was sent.",
    wrong: "Starting again from the top. The first doctors get the same email twice.",
    hint: "Where does the program record what it already did?",
    rows: [
      ["The demo prints outcome: duplicates on the NAIVE case", "Doctors got the email twice after a restart", "Read the ledger before each send"],
      ["A send carries an idempotency key", "The key stops the same send twice", "Keep each key, and never change it"],
      ["The job finishes but sends again", "The ledger line was not written", "Write the ledger line right after each send"],
    ],
  },
  budgets: {
    correct: "Check the worst case before each call. Refuse a call that would pass the run cap or the day cap.",
    wrong: "Counting tokens and calling that a budget. A count of tokens does not stop a money bill.",
    hint: "What is the most this call can cost, and which cap does it meet?",
    rows: [
      ["The demo prints outcome: never-stopped on the NAIVE case", "No money cap in the code", "Add a run cap and a day cap, checked before each call"],
      ["A call is refused before any money is spent", "Its worst case passed a cap", "This is correct. Raise a cap only with a reason"],
      ["A run is refused as too many hops", "The hop limit was reached", "Shorten the hand-overs, or raise the hop limit"],
    ],
  },
  "model-routing": {
    correct: "The small model answers first. Only a failed check sends the question to the strong model.",
    wrong: "Always using the strong model. It works, but it costs about ten times more than it needs.",
    hint: "Which answers need the strong model, and how would we know?",
    rows: [
      ["The demo prints outcome: always-big on the NAIVE case", "The strong model answered every question", "Try the small model first, then check its answer"],
      ["The small answer is not sent", "It failed the check", "This is correct. The check stopped a bad answer"],
      ["Nothing is sent after both fail", "Neither answer passed the check", "This is correct. A person should decide"],
    ],
  },
  "identity-and-scopes": {
    correct: "Check each bot's signed token, and run only the tools its scopes name.",
    wrong: "Sharing one key for every bot. Any bot can then do anything, including email it should not send.",
    hint: "Which scope does this tool need, and does the token list it?",
    rows: [
      ["The demo prints outcome: overreach on the NAIVE case", "The answer bot sent an email", "Give each bot its own token with only its scopes"],
      ["A tool call is refused", "The token is missing the scope, or has expired", "Issue a new token with the scope the tool needs"],
      ["A token is refused after an edit", "The signature no longer matches", "Never edit a token. Issue a new one"],
    ],
  },
  "act-for-user": {
    correct: "The bot searches only the country of the doctor its token names. The doctor's rights limit the bot.",
    wrong: "Using the bot's own service key. It searches the wrong country, so a German doctor gets the US label.",
    hint: "Whose rights should the search use: the bot's or the doctor's?",
    rows: [
      ["The demo prints outcome: wrong-label on the NAIVE case", "The service key searched the US", "Pass the delegation token, and search by its country"],
      ["A bad token answers nothing", "The token is not valid for this doctor", "Issue a fresh token when the doctor signs in"],
      ["Typing another country changes nothing", "The country comes from the token, not the question", "This is correct. The token wins"],
    ],
  },
  hooks: {
    correct: "Run a before hook on every call and an after hook on every output. A hook that crashes blocks the call.",
    wrong: "Writing the rule only in the prompt. The model can ignore it and email the note.",
    hint: "Where could a check run that the model cannot skip?",
    rows: [
      ["The demo prints outcome: leaked on the NAIVE case", "No hook ran, and the note was emailed", "Add a before hook that checks each email"],
      ["A call is blocked by a hook", "The before hook said no", "This is correct. Read the hook name in the log"],
      ["Every call is blocked", "A hook crashed, and fail closed blocks the call", "Fix the crash. Do not remove the hook"],
    ],
  },
  "traces-and-audit": {
    correct: "Write each step with a fingerprint of the one before it. Check the chain against the saved head.",
    wrong: "Trusting a plain log. Someone can edit it to tell any story, and nothing shows the edit.",
    hint: "If one line changed, which fingerprint would stop matching?",
    rows: [
      ["The demo prints outcome: unnoticed on the NAIVE case", "The edit in the plain log was not seen", "Chain each line to the one before, and check the head"],
      ["The check reports a broken line", "A line was changed, removed or cut", "Restore the file from the saved copy, then find who changed it"],
      ["The head matches but the check fails", "The head was saved where the trace is kept", "Save the head somewhere with a different owner"],
    ],
  },
  "evals-and-release": {
    correct: "Run every eval on the new version. Ship only when all evals pass.",
    wrong: "Shipping because the version still answers. A regression can give the wrong dose, and no one sees it.",
    hint: "Which eval would catch a German doctor getting the US dose?",
    rows: [
      ["The demo prints outcome: shipped-wrong on the NAIVE case", "The naive gate shipped a wrong version", "Run every eval, and block on any failure"],
      ["The release is blocked and names a question", "One eval failed", "Fix the version, or the eval if it is wrong. Never delete the eval"],
      ["The release is blocked on an empty eval set", "There are no evals, so nothing can pass", "Write at least one eval for each risk"],
    ],
  },
  routing: {
    correct: "The router sends each message to one specialist. A danger word, or an unknown route, goes to a person.",
    wrong: "One bot for every message. It answers a rash message with a dose.",
    hint: "Which message must never reach the answer bot?",
    rows: [
      ["The demo prints outcome: unsafe on the NAIVE case", "The rash message reached the answer bot", "Send messages with a danger word to a person"],
      ["A message goes to the fallback", "No rule fits it", "This is correct. A person reads it"],
      ["The outreach bot gets a dose question", "The route rule is too wide", "Narrow the route rule to its own kind of message"],
    ],
  },
  "chain-and-delegate": {
    correct: "Split the job, give each doctor to a worker, and pass each result along the chain. Each letter uses its doctor's country.",
    wrong: "One search for all doctors. The others get the wrong country's label.",
    hint: "Which country should this doctor's letter use?",
    rows: [
      ["The demo prints outcome: wrong-label on the NAIVE case", "One search ran for one country", "Give each doctor a worker with its own search"],
      ["A worker is named as failed", "That worker's step failed", "Retry it once, then hand it to a person. The others still go"],
      ["A letter does not pass the check", "The draft is not from the right document", "Check the letter before it is sent"],
    ],
  },
  "parallel-workers": {
    correct: "Start all workers at once. Stop a late worker at the deadline, and send the brief with the parts that came back.",
    wrong: "Running the systems one after another. A stuck system then holds up the whole brief.",
    hint: "What happens to the brief if one system never answers?",
    rows: [
      ["The demo prints outcome: slow on the NAIVE case", "The systems ran one after another", "Start all workers at the same time"],
      ["A part is missing from the brief", "That worker missed the deadline", "This is correct. Say which part is missing"],
      ["A worker crashed", "The crash is named in the brief", "Read the name, then fix that system"],
    ],
  },
  "subagent-isolation": {
    correct: "The helper reads the noisy search. The main agent keeps only the short report, then checks it.",
    wrong: "Letting the main agent read everything. Its context fills with old drafts, and it may copy a wrong dose.",
    hint: "Which text does the main agent really need to answer?",
    rows: [
      ["The demo prints outcome: flooded on the NAIVE case", "The main agent read all of the search", "Hand the noisy search to a helper"],
      ["The report is cut to the limit", "The helper wrote more than the limit", "This is correct. Read the report, not the log"],
      ["A made-up dose is refused", "The check found a dose the source does not have", "This is correct. The check did its job"],
    ],
  },
  handoffs: {
    correct: "Put each message in an envelope, and stop it at the hop limit or a repeat. Then send it to a person.",
    wrong: "Passing messages with no count. The bots send the message back and forth for ever.",
    hint: "How would a bot know it has seen this message before?",
    rows: [
      ["The demo prints outcome: looped on the NAIVE case", "No envelope, so no count or path", "Add an envelope with a hop count and a path"],
      ["The message is stopped at the limit", "The hop limit was reached", "Read the path, then fix the loop"],
      ["A bot is met twice", "The loop breaker fired", "This is correct. A person gets the list of bots"],
    ],
  },
  "shared-memory": {
    correct: "Save a fact only when it passes the dose check. Each fact keeps the source it came from.",
    wrong: "Saving whatever a bot says. The next bot reads the wrong dose and repeats it.",
    hint: "Who checked this fact, and where did it come from?",
    rows: [
      ["The demo prints outcome: poisoned on the NAIVE case", "A made-up dose was saved and reused", "Check each fact before it is saved"],
      ["A fact is not saved", "It failed the dose check", "This is correct. Ask the approved source again"],
      ["A saved fact has no source", "The writer did not record the source", "Save the source with every fact"],
    ],
  },
  "wakeups-and-board": {
    correct: "Run each job once per slot, using its key. Every run appears on the board as a card.",
    wrong: "Letting every wakeup run. A tick at hour 0 and hour 5 on the same day does the work twice.",
    hint: "Which key would show that this slot already ran?",
    rows: [
      ["The demo prints outcome: duplicates on the NAIVE case", "The job ran twice in one day", "Make each slot one key, and run a key only once"],
      ["A card says failed", "The run failed", "Read the card. Fix the cause, then wake the bot again"],
      ["A webhook is skipped", "Its id was seen before", "This is correct. A repeat is safe to skip"],
    ],
  },
  "hcp-360": {
    correct: "Join the four systems by NPI. Block the email on an opt-out or a recent contact.",
    wrong: "Reading only the email system. It shows nothing recent, so the doctor gets a second message.",
    hint: "Which system knows about the medical question from two days ago?",
    rows: [
      ["The demo prints outcome: spam on the NAIVE case", "The email system did not see the medical contact", "Merge all four systems before deciding"],
      ["The email is blocked", "The doctor is inside the quiet days, or opted out", "This is correct. Wait, or respect the opt-out"],
      ["A row has no NPI", "The doctor cannot be matched", "Hold the row for a person. Do not guess"],
    ],
  },
  "phi-vault": {
    correct: "The model sees tokens only. A reviewer can turn a token back into its value, and every try is logged.",
    wrong: "A fixed mask, such as [SSN] for every number. The reviewer cannot get the value back.",
    hint: "How can the reviewer tell two different numbers apart?",
    rows: [
      ["The demo prints outcome: lost on the NAIVE case", "The fixed mask hid the value for good", "Use a numbered token, such as [SSN-1], and keep the vault"],
      ["The reply shows only tokens", "The vault hid the real values from the agent", "This is correct. The agent must not see values"],
      ["A reviewer sees a real value", "The role is reviewer", "This is correct. Check the audit log for the reviewer"],
    ],
  },
  "fact-checker": {
    correct: "Check each sentence. A claim needs a citation, a document for this country, and the document's own words.",
    wrong: "Asking the model if the draft is fine. It has no new facts, so it says yes to a claim with no source.",
    hint: "Which words in the document say this, word for word?",
    rows: [
      ["The demo prints outcome: self-approved on the NAIVE case", "The model approved a claim that no document makes", "Check each claim against the document in code"],
      ["The email is blocked", "One sentence failed the check", "Read the blocked sentence, then fix or remove it"],
      ["A claim has a citation but still fails", "The words do not match the document", "Quote the document word for word"],
    ],
  },
  revocation: {
    correct: "Check the withdrawal list on every answer, even a saved one. A withdrawn document is never sent.",
    wrong: "Serving the saved answer. The cache never looks at the document again, so the old dose goes out.",
    hint: "Does the cache check the withdrawal list before it replies?",
    rows: [
      ["The demo prints outcome: stale on the NAIVE case", "The saved answer went out after withdrawal", "Check the withdrawal list on every cached reply"],
      ["The answer is refused after withdrawal", "The document is withdrawn now", "This is correct. Ask for a current document"],
      ["A US answer reaches a German doctor", "The country filter was skipped", "Filter by country on every reply, cached or not"],
    ],
  },
  "end-to-end": {
    correct: "Send the note through every guard. Only a checked reply, or one a person approved, goes out.",
    wrong: "Trusting one guard. Each guard works alone, so one missing guard is still a hole.",
    hint: "Which guard would stop this risk, and did it run?",
    rows: [
      ["The demo prints outcome: sent-unchecked on the NAIVE case", "No guard ran before the send", "Run every guard before the reply is sent"],
      ["The reply is held for a person", "A guard blocked it", "Read which guard blocked it, then decide at the gate"],
      ["The record shows an edit", "A line in the record changed", "Find the line with the edit, and restore it from the saved copy"],
    ],
  },
};
