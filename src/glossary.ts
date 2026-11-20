// THE GLOSSARY. Every new word in the labs is defined once, here.
// A lab lists the ids it uses. Its page and its screen both read the meaning from this file.
// One word has one meaning. Two different senses get two ids (token and model-token).
// bun run check fails if a meaning is long, if a word is defined twice, or if no lab uses it.

export type Word = { word: string; meaning: string };

export const GLOSSARY: Record<string, Word> = {
  // Guardrails and PHI redaction lab
  phi: { word: "PHI", meaning: "Protected health information. Facts that can point to a patient, such as a name or record number." },
  token: { word: "token", meaning: "A short label, such as [SSN] or [SSN-1], that stands in for a private value." },
  guardrail: { word: "guardrail", meaning: "A check in plain code, before or after the model, that can stop or change text." },

  // Human in the loop gates lab
  gate: { word: "gate", meaning: "A stop in the run where a person must say yes before it goes on." },
  "human-in-the-loop": { word: "human in the loop", meaning: "A design where a person checks the risky steps before they happen." },
  escalate: { word: "escalate", meaning: "Send the case to a person, because the system is not sure." },

  // Workflow, one agent, multi-agent lab
  workflow: { word: "workflow", meaning: "A fixed set of steps written in code. The model writes text but does not pick the steps." },
  agent: { word: "agent", meaning: "A model that picks its own next step and tool, inside a loop." },
  "many-agents": { word: "many agents", meaning: "Several models, each with one job, that pass work between them." },
  auditor: { word: "auditor", meaning: "A model that checks the work of another model." },

  // The agent loop lab
  loop: { word: "loop", meaning: "The model asks for a tool, the code runs it, and the model reads the result." },
  tool: { word: "tool", meaning: "A function the model may ask our code to run, such as a search." },

  // Tool schemas and structured output lab
  schema: { word: "schema", meaning: "The rules for a valid input: its fields, their types and which ones are required." },
  json: { word: "JSON", meaning: "A text format for data made of named fields and their values." },
  reject: { word: "reject", meaning: "Refuse a tool call, so the tool never runs." },

  // A shell tool, safely lab
  shell: { word: "shell", meaning: "A program that reads text commands, such as ls, and runs them." },
  "allow-list": { word: "allow-list", meaning: "A list of the only items we allow. Anything else is refused." },
  sandbox: { word: "sandbox", meaning: "A limited space, here one folder, that the program may not leave." },

  // MCP basics lab
  mcp: { word: "MCP", meaning: "Model Context Protocol. A standard way for an agent to find and call tools." },
  "mcp-server": { word: "MCP server", meaning: "The program that owns the tools and runs them when asked." },
  "json-rpc": { word: "JSON-RPC", meaning: "The message format that MCP uses. Each request and reply is one JSON message." },

  // Trusting an MCP server lab
  pin: { word: "pin", meaning: "Save what a tool looked like when we approved it, so we can compare later." },
  "rug-pull": { word: "rug pull", meaning: "A server changes a tool after we approve it." },
  fingerprint: { word: "fingerprint", meaning: "A short code made from a text. Change one letter and the code changes." },

  // Function, CLI or MCP lab
  door: { word: "door", meaning: "One way an agent reaches a tool: a function, a command or an MCP server." },
  latency: { word: "latency", meaning: "How long one call takes, from the ask to the answer." },
  structured: { word: "structured", meaning: "Has named fields that a program can read." },

  // The context budget lab
  "context-window": { word: "context window", meaning: "The most text a model can read at one time, counted in tokens." },
  "model-token": { word: "model token", meaning: "A small piece of text that a model counts. Often part of a word." },
  receipt: { word: "receipt", meaning: "A one-line stand-in for a big tool result. The full result is saved on disk." },
  compaction: { word: "compaction", meaning: "Folding old work into short notes when the prompt fills up. The full text stays on disk." },
  budget: { word: "budget", meaning: "The most we allow ourselves to spend, in tokens, money, steps or time." },

  // Trimming long history lab
  history: { word: "history", meaning: "The earlier turns of a chat, which the model reads again on each call." },
  trim: { word: "trim", meaning: "Leave out old turns to make room in the prompt." },
  brief: { word: "brief", meaning: "A short record of the facts a client gave. We fill it as the chat goes on." },

  // Retrieval lab
  chunk: { word: "chunk", meaning: "A small piece of a document, such as one paragraph." },
  bm25: { word: "BM25", meaning: "A standard formula that scores a chunk by the rare words it shares with the question." },
  score: { word: "score", meaning: "A number that says how well one chunk matches the question." },
  retrieval: { word: "retrieval", meaning: "Finding the chunks that best answer a question, before the model reads them." },

  // Picking the right context lab
  source: { word: "source", meaning: "A place that holds approved facts, such as the documents for one country." },
  "context-picking": { word: "context picking", meaning: "Choosing which sources to load for one question, using a rule in code." },
  overloaded: { word: "overloaded", meaning: "Given more text than the question needs, which can confuse the model." },

  // Instructions versus data lab
  "prompt-injection": { word: "prompt injection", meaning: "A hidden order in data, such as an email, that tries to steer the model." },
  fence: { word: "data fence", meaning: "A labelled box that tells the model where the mail starts and ends." },
  held: { word: "held", meaning: "Kept back for a person to look at, so the bot does not act on it." },

  // Stop conditions lab
  step: { word: "step", meaning: "One trip round the loop: the model acts, then the code reacts." },
  "stuck-call": { word: "stuck call", meaning: "The same tool call, with the same input, made again and again with no progress." },

  // Error feedback and retries lab
  retry: { word: "retry", meaning: "Try the same call again after it failed." },
  hint: { word: "hint", meaning: "A short line that says what the error expected, so the model can fix its call." },
  "ask-a-person": { word: "ask a person", meaning: "Stop and let a person decide, because only they know what was meant." },

  // Plan, then act lab
  plan: { word: "plan", meaning: "A list of steps, written before the first step runs." },
  "risky-step": { word: "risky step", meaning: "A step that cannot be undone, such as booking a room." },

  // Reflect and fix lab
  draft: { word: "draft", meaning: "The first answer, before it is checked." },
  check: { word: "check", meaning: "A rule in plain code that a draft must pass before it goes out." },
  round: { word: "round", meaning: "One fix, followed by one more check." },

  // Run state lab
  run: { word: "run", meaning: "One job from its start to its end." },
  "run-record": { word: "run record", meaning: "A file that saves the run's id, its status and one line for each applicant." },
  stalled: { word: "stalled", meaning: "Still marked as running, but no step has finished for too long." },

  // When tools fail lab
  timeout: { word: "timeout", meaning: "The longest time we wait for a reply before we give up on the call." },
  backoff: { word: "backoff", meaning: "Wait longer before each retry." },
  transient: { word: "transient", meaning: "A failure that may pass if we try again, such as a brief outage." },

  // Crash and resume lab
  ledger: { word: "ledger", meaning: "A file on disk that lists each step already finished." },
  "idempotency-key": { word: "idempotency key", meaning: "A unique name for one action, so it happens once, even if asked twice." },
  resume: { word: "resume", meaning: "Start again from the ledger and carry on, not from the beginning." },
  sigkill: { word: "SIGKILL", meaning: "A signal that stops a program at once. The program cannot catch it or clean up." },

  // Budgets lab
  millicent: { word: "millicent", meaning: "A thousandth of a cent. Using it keeps every amount a whole number." },
  cap: { word: "cap", meaning: "A hard limit we set, such as the money one run may spend." },
  "worst-case": { word: "worst case", meaning: "The most one call can cost, if the model uses its longest answer." },
  hop: { word: "hop", meaning: "One step where work passes from one bot or agent to another." },

  // Model routing and caching lab
  route: { word: "route", meaning: "Pick which model or helper handles a request." },
  cascade: { word: "cascade", meaning: "Try the cheap model first, and use a stronger one only if the answer fails the check." },

  // Identity and scopes lab
  identity: { word: "identity", meaning: "Who is calling: a named bot or a named person." },
  scope: { word: "scope", meaning: "A right, such as reading documents, that a token gives." },
  "least-privilege": { word: "least privilege", meaning: "Give each bot only the scopes it needs, and no more." },
  "signed-token": { word: "signed token", meaning: "A note, signed by us, that lists what a bot may do and until when." },

  // Acting for a user lab
  "act-for-user": { word: "act for a user", meaning: "Do a task as a named person, with only the rights that person has." },
  delegation: { word: "delegation", meaning: "A person lets a bot act for her, for one set job." },
  "service-key": { word: "service key", meaning: "One shared secret that a bot uses. No person is on it, so no one is named." },

  // Hooks lab
  hook: { word: "hook", meaning: "Code that runs before or after every tool call." },
  "before-hook": { word: "before hook", meaning: "Code that runs first, and may stop the call." },
  "after-hook": { word: "after hook", meaning: "Code that runs last, and may check or change the output." },
  "fail-closed": { word: "fail closed", meaning: "If the check itself breaks, refuse the action." },

  // Traces and the audit ledger lab
  trace: { word: "trace", meaning: "A record of every step that a run took." },
  "hash-chain": { word: "hash chain", meaning: "A list where each line stores the fingerprint of the line before it." },
  head: { word: "head", meaning: "The last fingerprint, saved where an edit to the list cannot reach it." },

  // Evals and the release gate lab
  eval: { word: "eval", meaning: "A test question, with the facts that a right answer must contain." },
  "eval-set": { word: "eval set", meaning: "The full list of evals, run before each release." },
  "release-gate": { word: "release gate", meaning: "A check that blocks a new version when a test fails." },
  regression: { word: "regression", meaning: "Something that used to work and now fails." },

  // Routing lab
  router: { word: "router", meaning: "The step that picks who handles each message." },
  specialist: { word: "specialist", meaning: "A bot or a person that handles one kind of job well." },
  fallback: { word: "fallback", meaning: "Where a message goes when no rule fits it." },

  // Chains and delegation lab
  chain: { word: "chain", meaning: "Steps where each result feeds the next step." },
  delegate: { word: "delegate", meaning: "Hand one part of a job to a worker, and wait for its result." },
  lead: { word: "lead", meaning: "The agent that splits the job and gathers the results." },
  worker: { word: "worker", meaning: "A program or agent that does one small part of a job." },

  // Parallel workers lab
  parallel: { word: "parallel", meaning: "At the same time, not one after another." },
  deadline: { word: "deadline", meaning: "The time after which we stop waiting for a worker." },
  merge: { word: "merge", meaning: "Join pieces from several sources into one result." },

  // Subagents with their own context lab
  helper: { word: "helper", meaning: "A second agent with its own context, used for noisy work." },
  context: { word: "context", meaning: "Everything an agent has read so far, which it keeps in its window." },
  report: { word: "report", meaning: "The short answer a helper sends back." },

  // Handoffs between agents lab
  handoff: { word: "handoff", meaning: "One bot passes the work to another bot." },
  envelope: { word: "envelope", meaning: "The wrapper around a message. It counts the hops and lists the bots it passed." },
  "loop-breaker": { word: "loop breaker", meaning: "A rule that stops a message that keeps going round in circles." },

  // Memory the bots share lab
  "shared-memory": { word: "shared memory", meaning: "Facts that every bot can read." },
  poisoned: { word: "poisoned", meaning: "Said of memory that holds a wrong fact that got in." },
  provenance: { word: "provenance", meaning: "Where a fact came from: who saved it, and from which source." },

  // Wakeups and the mission board lab
  wakeup: { word: "wakeup", meaning: "A moment when a bot starts on its own, from a timer or an event." },
  slot: { word: "slot", meaning: "One fixed period of time, such as one day, that a job runs in once." },
  board: { word: "board", meaning: "A list of cards, one for each run, that shows what each agent did." },
  idempotent: { word: "idempotent", meaning: "Safe to run twice, with the same result as running once." },

  // One profile per doctor lab
  npi: { word: "NPI", meaning: "A 10-digit number that names one doctor." },
  "opt-out": { word: "opt-out", meaning: "The doctor asked us not to send emails." },
  "quiet-days": { word: "quiet days", meaning: "Days we wait after a contact before we write." },

  // The PHI vault lab
  vault: { word: "vault", meaning: "The place that keeps the real values behind the tokens." },
  role: { word: "role", meaning: "What a person is allowed to do, such as review a record." },
  "audit-log": { word: "audit log", meaning: "A list of every try, allowed or refused." },

  // The claim checker lab
  claim: { word: "claim", meaning: "A sentence that says something about a drug, such as its dose." },
  citation: { word: "citation", meaning: "The name of a source in square brackets, such as [CARDIOZA-US]." },
  "word-for-word": { word: "word for word", meaning: "The same words as the source, with nothing changed." },

  // Country rules and revocation lab
  withdrawn: { word: "withdrawn", meaning: "The company took the document back, so no one may use it." },
  cache: { word: "cache", meaning: "A store of saved answers, so the next ask is faster." },
  revoke: { word: "revoke", meaning: "Make a saved answer stop working in every place." },

  // Put it all together lab
  guard: { word: "guard", meaning: "One check that stops one kind of risk." },
  record: { word: "record", meaning: "A log of every step, linked so that any edit shows." },
};
