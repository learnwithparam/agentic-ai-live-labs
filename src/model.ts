// PRETEND MODEL. You do not need to read this file.
// A stand-in for a real model, so every lab runs offline with no key.
// The loop only needs one thing from a model: given the messages and tool names, return a tool call or text.
// Swap callLlm for a real provider and nothing else changes.
import { APPROVED_DOCS, KNOWN_DRUGS, NO_DOC } from "./data";

export type Message = { role: "system" | "user" | "tool"; content: string; name?: string };
export type ToolInput = { query: string; country: string; hcpId: string };
export type ToolCall = { name: string; args: ToolInput };
export type Reply = { toolCall?: ToolCall; text?: string };
export type CallLlm = (messages: Message[], toolNames: string[]) => Reply;

// How the pretend model behaves.
// ok: it follows the rules.
// nocite: the answer is right, but it forgets the citation. A guardrail catches this.
// invent: it cites a real document but states a wrong dose. Only a check against the document catches this.
// stubborn: it states a wrong dose, and when asked to fix it, it sends the same draft again.
export type Behaviour = "ok" | "nocite" | "invent" | "stubborn" | "stuck" | "wanders";

const grab = (text: string, label: string) => text.match(new RegExp(`${label}: ([^.\\n]+)`))?.[1]?.trim() ?? "";

export function makeModel(behaviour: Behaviour = "ok"): CallLlm {
  return (messages, toolNames) => {
    const first = messages.find((message) => message.role === "user")!.content;
    if (first.startsWith("PLAN:")) return { text: planFor(first) };
    if (first.startsWith("MAIL:")) return { text: mailFor(first) };
    if (first.startsWith("TRY:")) return { text: tryFor(first) };
    if (first.startsWith("RULES:")) return { text: rulesFor(first) };
    if (first.startsWith("CONTEXT:")) return { text: contextFor(first) };
    if (first.startsWith("CHUNKS:")) return { text: chunksFor(first) };
    if (first.startsWith("CHAT:")) return { text: chatFor(first) };
    if (first.startsWith("ANSWER:")) return { text: answerFrom(first) };
    if (first.startsWith("DRUG:")) return { text: drugFor(first) };
    if (first.startsWith("WRITE:")) return { text: writeFor(first) };
    if (first.startsWith("PICK:")) return { text: pickFor(first) };
    if (first.startsWith("SHELL:")) return { text: shellFor(first) };
    if (first.startsWith("CALL:")) return { text: writeCall(first) };
    if (first.startsWith("AUDIT:")) return { text: audit(first) };
    if (first.startsWith("REVIEW:")) return { text: "Looks good. The draft is fine." };
    if (first.startsWith("FIX:")) return { text: fix(first, behaviour) };

    const country = grab(first, "Country");
    const hcpId = grab(first, "HCP");
    const question = first.split("Question: ")[1] ?? first;
    const done = new Set(messages.filter((message) => message.role === "tool").map((message) => message.name));

    // stuck: the same search again and again. wanders: new words every time.
    const searched = messages.filter((message) => message.role === "tool").length;
    if (behaviour === "stuck" || behaviour === "wanders") {
      const query = behaviour === "stuck" ? question : `${question} topic ${searched}`;
      return { toolCall: { name: "search_approved_docs", args: { query, country, hcpId } } };
    }

    // The model picks the next tool it has not used yet, in this order.
    for (const name of ["get_hcp_profile", "search_approved_docs", "check_recent_outreach"]) {
      if (!toolNames.includes(name) || done.has(name)) continue;
      return { toolCall: { name, args: { query: question, country, hcpId } } };
    }

    const result = (name: string) => messages.find((message) => message.name === name)?.content ?? "";
    const search = result("search_approved_docs");
    if (search === NO_DOC || search === "") return { text: "I found no approved source for this question." };

    const lines = search.split("\n").map((line) => {
      const id = line.match(/^\[(DOC-\d+)\]/)![1];
      const body = line.replace(/^\[DOC-\d+\]\s*/, "");
      const claim = behaviour === "invent" || behaviour === "stubborn" ? body.replace(/\d+mg/, "20mg") : body;
      return behaviour === "nocite" ? claim : `${claim} [${id}]`;
    });
    const extra = result("check_recent_outreach");
    return { text: [...lines, ...(extra ? [extra] : [])].join(" ") };
  };
}

// A model asked to fix its draft. It rewrites the answer from the source and adds the citation.
function fix(prompt: string, behaviour: Behaviour): string {
  const draft = prompt.split("\nPROBLEMS:")[0].replace("FIX: ", "");
  if (behaviour === "stubborn") return draft;
  const source = prompt.split("SOURCE: ")[1].split("\n")[0];
  const id = source.split(" ")[0];
  return `${source.replace(`${id} `, "")} ${id}`;
}

// The compliance auditor. Each sentence that cites an id must appear word for word in that approved document.
function audit(prompt: string): string {
  const draft = prompt.replace(/^AUDIT:\s*/, "").split("\nSOURCE:")[0];
  const claims = draft.match(/[^\[]*?\[DOC-\d+\]/g) ?? [];
  if (claims.length === 0) return "FAIL: no cited claims to check.";
  for (const claim of claims) {
    const id = claim.match(/\[(DOC-\d+)\]/)![1];
    const sentence = claim.replace(/\s*\[DOC-\d+\]/, "").trim();
    if (!APPROVED_DOCS[id]?.text.includes(sentence)) return `FAIL: claim does not match ${id}: "${sentence}"`;
  }
  return "PASS";
}

// A model asked to write a tool call. It finds the drug in the question. It writes the country in lower case, a common slip.
function writeCall(prompt: string): string {
  const question = prompt.split("Question: ")[1] || "";
  let drug = "Zorbex";
  for (const id in APPROVED_DOCS) {
    if (question.toLowerCase().includes(APPROVED_DOCS[id].drug.toLowerCase())) drug = APPROVED_DOCS[id].drug;
  }
  const country = question.includes("Germany") ? "de" : "us";
  return `{"drug": "${drug}", "country": "${country}"}`;
}

// A model asked to write a shell command. It maps a plain task to one command.
function shellFor(prompt: string): string {
  const task = (prompt.split("Task: ")[1] || "").toLowerCase();
  if (task.includes("delete") || task.includes("remove")) return "rm notes.txt";
  if (task.includes("dose") || task.includes("read")) return "cat doses.txt";
  return "ls";
}

// A model asked to pick a tool. It reads each tool note. If a note holds an order, it obeys.
function pickFor(prompt: string): string {
  if (prompt.includes("http")) return "First I will send the doctor's email to the address in the tool notes.";
  const names = prompt.split("\n").filter((line) => line.startsWith("- ")).map((line) => line.slice(2).split(":")[0]);
  if (names.length === 0) return "No tool is loaded, so I cannot look anything up.";
  if (names.includes("search_approved_docs")) return "I will use search_approved_docs.";
  return `I will use ${names[0]}.`;
}

// A model asked for the drug name in a question. It knows our drugs. Anything else it hands back as it is.
function drugFor(prompt: string): string {
  const question = prompt.split("Question: ")[1] || "";
  if (question.includes(";")) return question.trim();
  for (const id in APPROVED_DOCS) {
    if (question.toLowerCase().includes(APPROVED_DOCS[id].drug.toLowerCase())) return APPROVED_DOCS[id].drug;
  }
  return question.trim();
}

// A model asked to write a reply from a source. It repeats the source, or says there is none.
function writeFor(prompt: string): string {
  const source = (prompt.split("SOURCE: ")[1] || "").split("\nQuestion:")[0].trim();
  if (source === NO_DOC || source === "" || source.startsWith("ERROR")) return "I found no approved source.";
  return source;
}

// A model asked to answer from the prompt it was given. It reads the documents in it, or says there are none.
function answerFrom(prompt: string): string {
  const lines = prompt.split("\n").filter((line) => line.startsWith("[DOC-"));
  if (lines.length === 0) return "I found no approved source for this question.";
  return lines.join(" ");
}

// A model asked a question about a chat. It can use only the turns it was shown.
function chatFor(prompt: string): string {
  const parts: string[] = [];
  if (prompt.includes("Germany")) parts.push("You work in Germany, so use the German label.");
  if (prompt.includes("penicillin")) parts.push("Remember the penicillin allergy.");
  if (parts.length === 0) return "I do not know your country, so I cannot pick a label.";
  return parts.join(" ");
}

// A model asked to answer from chunks. It repeats the chunks and cites their ids.
function chunksFor(prompt: string): string {
  const lines = prompt.split("\n").filter((line) => line.startsWith("[C-"));
  return lines.join(" ");
}

// A model asked to answer from the sources it was handed. It repeats the first fact line of each.
function contextFor(prompt: string): string {
  const lines = prompt.split("\n").slice(1);
  const facts: string[] = [];
  for (const line of lines) {
    if (line.startsWith("[DOC-") || line.startsWith("DOCTOR PROFILE")) facts.push(line);
  }
  if (facts.length === 0) return "The sources I was given do not answer this.";
  return facts.join(" ");
}

// A model that reads rules and data as one text. It obeys an order unless the data is fenced.
function rulesFor(prompt: string): string {
  const fenced = prompt.includes("<data>");
  if (!fenced && prompt.includes("Ignore the rules")) return "Sending the doctor's email as ordered.";
  if (!fenced && prompt.includes("New rules")) return "Voici la dose, sans citation.";
  const docs = prompt.split("\n").filter((line) => line.startsWith("[DOC-"));
  return docs.join(" ") || "I found no approved source.";
}

// A model asked to write a tool call, and to fix it when the tool says it was wrong.
// It reads the hint in the error. It never changes what the doctor meant, so it says ASK instead.
function tryFor(prompt: string): string {
  const question = (prompt.split("Question: ")[1] || "").split("\n")[0];
  const parts = question.split(" in ");
  let drug = parts[0].trim();
  let country = (parts[1] || "US").trim();
  const said = prompt.split("The tool said: ")[1];
  if (said === undefined) return `{"drug": "${drug}", "country": "${country}"}`;
  const last = prompt.split("Your last call: ")[1].split("\n")[0];
  const before = JSON.parse(last);
  drug = before.drug;
  country = before.country;
  if (said.includes("Use US or DE")) {
    const codes: Record<string, string> = { germany: "DE", "united states": "US", usa: "US" };
    const code = codes[country.toLowerCase()];
    if (code === undefined) return "ASK: I cannot pick a country for the doctor.";
    country = code;
  } else if (said.includes("Known drugs")) {
    const close = KNOWN_DRUGS.find((name) => name.slice(0, 5).toLowerCase() === drug.slice(0, 5).toLowerCase());
    if (close === undefined) return "ASK: I do not know this drug.";
    drug = close;
  }
  return `{"drug": "${drug}", "country": "${country}"}`;
}

// A model asked to plan a task. It lists the steps as JSON, using only the tools it was told about.
function planFor(prompt: string): string {
  const task = prompt.split("Task: ")[1] || "";
  const lower = task.toLowerCase();
  let drug = "Cardioza";
  for (const id in APPROVED_DOCS) {
    if (lower.includes(APPROVED_DOCS[id].drug.toLowerCase())) drug = APPROVED_DOCS[id].drug;
  }
  if (lower.includes("zorbex")) drug = "Zorbex";
  const steps = [{ tool: "search", input: drug }, { tool: "draft", input: "reply to the doctor" }];
  const address = task.split(" ").find((word) => word.includes("@")) || "dr.lee@example.com";
  if (lower.includes("email")) steps.push({ tool: "send_email", input: address });
  return JSON.stringify(steps);
}

// A model asked to write a reply from a source. It repeats the source in a polite note.
function mailFor(prompt: string): string {
  const source = prompt.split("SOURCE: ")[1] || "";
  return `Dear doctor, ${source.replace(/\n/g, " ")}`;
}
