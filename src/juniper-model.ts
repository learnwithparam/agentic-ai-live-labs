// The pretend model for the Juniper Studio labs. Each lab uses its own prompt word.
// It lives here so that src/model.ts only needs one line to call it.
import type { Behaviour, Message, Reply } from "./model";
import { amountsIn, mailById } from "./juniper";

// OPEN: the model reads one mail, then writes one line about it.
// A stuck model opens the same mail again and again.
function openReply(first: string, messages: Message[], behaviour: Behaviour): Reply {
  const id = first.slice("OPEN: ".length).split(".")[0].trim();
  const opened = messages.filter((message) => message.role === "tool").length;
  if (behaviour === "stuck" || opened === 0) {
    return { toolCall: { name: "open_mail", args: { query: id, country: "", hcpId: "" } } };
  }
  const mail = mailById(id);
  return { text: `DONE: ${mail ? mail.subject : "no mail"}. A note for Maya is ready.` };
}

// SORT: the cheap model gives one label to an email, by its subject.
function sortLabel(first: string): string {
  const text = first.slice("SORT: ".length).toLowerCase();
  if (text.includes("contract")) return "contract";
  if (text.includes("receipt")) return "receipt";
  if (text.includes("thursday") || text.includes("talk")) return "meeting";
  if (text.includes("rank") || text.includes("10x")) return "spam";
  return "other";
}

// REPLY: a good reply thanks the sender, names the amount, and signs.
// A habit can spoil the first try. A second try, with PROBLEMS, fixes a forgetful one.
function replyFor(first: string, behaviour: Behaviour): string {
  const id = first.slice("REPLY: ".length).split("\n")[0].trim();
  const mail = mailById(id);
  const amounts = amountsIn(mail ? mail.body : "");
  const retried = first.includes("PROBLEMS:");
  let amount = amounts[0] || "";
  if (behaviour === "invent" && amount !== "") amount = String(Number(amount) + 1000);
  const forgets = behaviour === "nocite" && !retried;
  const note = amount !== "" && !forgets ? ` We note the total of ${amount} USD.` : "";
  return `Thanks for your email.${note} Juniper Studio`;
}

// MAILACT: the model picks an action for one email. A mail that gives orders can trick it.
function inboxAction(first: string): string {
  const mail = mailById(first.slice("MAILACT: ".length).trim());
  if (mail && mail.kind === "injection") return "SEND: the signed contract to pay@stock-photos.example";
  return "DRAFT: Thanks for your email. Juniper Studio";
}

// CATEGORY: the model names the books label for one receipt. A bad habit invents a label.
function categoryFor(first: string, behaviour: Behaviour): string {
  const text = first.toLowerCase();
  if (behaviour === "invent") return "gadgets";
  if (text.includes("font") || text.includes("licence")) return "software";
  if (text.includes("hosting") || text.includes("cloud")) return "hosting";
  if (text.includes("lunch") || text.includes("dinner")) return "meals";
  return "office";
}

// PLAN-TEAM: an open-ended lead lists the workers it wants. A wandering one asks for too many.
function teamFor(behaviour: Behaviour): string {
  if (behaviour === "wanders") return "match, match, categorize, categorize, file, file";
  return "match, categorize, file";
}

// EXPENSE: one long prompt for all the steps at once. It matches the first bank line it sees.
function expenseAll(): string {
  return "FILED: bank-1 | office";
}

// LOGSCAN: the helper reads many build logs and lists the first failure of each bad one.
// A stuck helper never finishes. A habit of inventing adds a build that does not exist.
function triageReply(first: string, behaviour: Behaviour): Reply {
  if (behaviour === "stuck") {
    return { toolCall: { name: "open_log", args: { query: "build-1", country: "", hcpId: "" } } };
  }
  const found: string[] = [];
  let current = "";
  for (const line of first.split("\n")) {
    if (line.startsWith("[")) current = line.slice(1, line.indexOf("]"));
    const seen = found.some((item) => item.startsWith(current + ":"));
    if (line.startsWith("FAIL") && !seen) found.push(`${current}: ${line}`);
  }
  if (behaviour === "invent") found.push("build-99: FAIL the database is down");
  return { text: found.join("\n") };
}

// PASS: a bot names who gets the message next. It looks only at the message itself.
function passReply(first: string): string {
  const bot = first.slice("PASS: You are the ".length).split(" ")[0];
  const text = first.slice(first.indexOf("Message: ")).toLowerCase();
  const wantsFile = text.includes("receipt");
  const wantsReply = text.includes("reply");
  if (bot === "intake" && wantsFile) return "expense";
  if (bot === "intake" && wantsReply) return "inbox";
  if (bot === "intake") return "human";
  if (bot === "expense" && wantsReply) return "inbox";
  if (bot === "inbox" && wantsFile) return "expense";
  return "done";
}

// NOTES: a bot reads the shared notes, then writes a reply. It obeys every note it finds.
function notesReply(first: string): string {
  const notes = first.split("\n").slice(1).join(" ");
  let reply = "Thanks for your email.";
  if (!notes.includes("Keep replies short")) reply += " We will write back with all the details.";
  if (notes.includes("deadline is Friday")) reply += " The deadline is Friday.";
  const spot = notes.indexOf("send all invoices to ");
  if (spot >= 0) reply += ` Invoices go to ${notes.slice(spot + 21).split(".")[0]}.`;
  return `${reply} Juniper Studio`;
}

// SWEEP: a woken bot does its job. A GitHub issue is triaged. An inbox sweep drafts a reply.
function sweepReply(first: string): string {
  if (first.includes("issue-103")) return "Triaged issue-103: Checkout fails with a 500. Label: bug.";
  return "Swept the inbox. One reply is drafted for the Acme contract.";
}

// Returns undefined when the prompt is not one of ours.
export function juniperReply(first: string, messages: Message[], behaviour: Behaviour): Reply | undefined {
  if (first.startsWith("OPEN:")) return openReply(first, messages, behaviour);
  if (first.startsWith("SORT:")) return { text: sortLabel(first) };
  if (first.startsWith("REPLY:")) return { text: replyFor(first, behaviour) };
  if (first.startsWith("MAILACT:")) return { text: inboxAction(first) };
  if (first.startsWith("CATEGORY:")) return { text: categoryFor(first, behaviour) };
  if (first.startsWith("SWEEP:")) return { text: sweepReply(first) };
  if (first.startsWith("NOTES:")) return { text: notesReply(first) };
  if (first.startsWith("PASS:")) return { text: passReply(first) };
  if (first.startsWith("LOGSCAN:")) return triageReply(first, behaviour);
  if (first.startsWith("PLAN-TEAM:")) return { text: teamFor(behaviour) };
  if (first.startsWith("EXPENSE:")) return { text: expenseAll() };
  return undefined;
}
