// PRETEND MODEL. You do not need to read this file.
// A stand-in for a real model, so every lab runs offline with no key.
// The loop only needs one thing from a model: given the messages and tool names, return a tool call or text.
// Swap callLlm for a real provider and nothing else changes.
import { APPROVED_DOCS, NO_DOC } from "./data";

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
export type Behaviour = "ok" | "nocite" | "invent" | "stubborn";

const grab = (text: string, label: string) => text.match(new RegExp(`${label}: ([^.\\n]+)`))?.[1]?.trim() ?? "";

export function makeModel(behaviour: Behaviour = "ok"): CallLlm {
  return (messages, toolNames) => {
    const first = messages.find((message) => message.role === "user")!.content;
    if (first.startsWith("SHELL:")) return { text: shellFor(first) };
    if (first.startsWith("CALL:")) return { text: writeCall(first) };
    if (first.startsWith("AUDIT:")) return { text: audit(first) };
    if (first.startsWith("REVIEW:")) return { text: "Looks good. The draft is fine." };
    if (first.startsWith("FIX:")) return { text: fix(first, behaviour) };

    const country = grab(first, "Country");
    const hcpId = grab(first, "HCP");
    const question = first.split("Question: ")[1] ?? first;
    const done = new Set(messages.filter((message) => message.role === "tool").map((message) => message.name));

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
