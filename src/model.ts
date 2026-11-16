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

// ok      = follows the rules
// nocite  = gives a right answer but forgets to cite (the output guardrail catches this)
// invent  = cites a real id but states a wrong dose (only an auditor catches this)
export type Behaviour = "ok" | "nocite" | "invent";

const grab = (text: string, label: string) => text.match(new RegExp(`${label}: ([^.\\n]+)`))?.[1]?.trim() ?? "";

export function makeModel(behaviour: Behaviour = "ok"): CallLlm {
  return (messages, toolNames) => {
    const first = messages.find((message) => message.role === "user")!.content;
    if (first.startsWith("AUDIT:")) return { text: audit(first) };

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
      const claim = behaviour === "invent" ? body.replace(/\d+mg/, "20mg") : body;
      return behaviour === "nocite" ? claim : `${claim} [${id}]`;
    });
    const extra = result("check_recent_outreach");
    return { text: [...lines, ...(extra ? [extra] : [])].join(" ") };
  };
}

// The compliance auditor. Each sentence that cites an id must appear word for word in that approved document.
function audit(prompt: string): string {
  const draft = prompt.replace(/^AUDIT:\s*/, "");
  const claims = draft.match(/[^\[]*?\[DOC-\d+\]/g) ?? [];
  if (claims.length === 0) return "FAIL: no cited claims to check.";
  for (const claim of claims) {
    const id = claim.match(/\[(DOC-\d+)\]/)![1];
    const sentence = claim.replace(/\s*\[DOC-\d+\]/, "").trim();
    if (!APPROVED_DOCS[id]?.text.includes(sentence)) return `FAIL: claim does not match ${id}: "${sentence}"`;
  }
  return "PASS";
}
