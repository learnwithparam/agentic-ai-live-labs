// More Juniper Studio data for the labs on budgets, routing, acting for a user and teamwork.
// All of it is invented. Each lab's promise test checks its answer against it.
import type { CallLlm, Reply } from "./model";
import { BANK, CI_LOGS, INBOX, RECEIPTS, type Email, type Receipt } from "./team";

// ---- A mail with a very long PDF (budgets lab) ----
export const REPORT_PAGES = 300;
const TOKENS_PER_PAGE = 500;

export const REPORT_MAIL: Email = {
  id: "mail-report",
  from: "ops@acme-dental.example",
  subject: "Annual brand report",
  body: `The full report is attached. [PDF pages: ${REPORT_PAGES}]`,
  kind: "report",
};

export function mailById(id: string): Email | undefined {
  if (id === REPORT_MAIL.id) return REPORT_MAIL;
  for (const mail of INBOX) {
    if (mail.id === id) return mail;
  }
  return undefined;
}

// What the mail looks like to the model: the subject, the body and the PDF note.
export function mailText(id: string): string {
  const mail = mailById(id);
  if (mail === undefined) return "NO_MAIL";
  return `Subject: ${mail.subject}. ${mail.body}`;
}

// A PDF adds tokens that the text does not show. We read the page count from the note.
export function pdfTokens(text: string): number {
  const start = text.indexOf("[PDF pages: ");
  if (start < 0) return 0;
  const end = text.indexOf("]", start);
  const pages = Number(text.slice(start + "[PDF pages: ".length, end));
  if (Number.isNaN(pages)) return 0;
  return pages * TOKENS_PER_PAGE;
}

// ---- Sorting 500 emails and writing a reply (model routing lab) ----

// A big inbox for a busy week: the six sample mails, again and again.
export function bigInbox(count: number): Email[] {
  const list: Email[] = [];
  for (let i = 0; i < count; i++) {
    const sample = INBOX[i % INBOX.length];
    list.push({ ...sample, id: sample.id + "-" + i });
  }
  return list;
}

// The small model sorts each email by its subject. We count the labels.
const SORT_RULE =
  "SORT: Reply with one word: contract, receipt, meeting, spam or other.\nSUBJECT: ";

// Ask once per message. The 500 emails repeat, so a live model is called once per subject.
export function remembered(callLlm: CallLlm): CallLlm {
  const seen = new Map<string, Reply>();
  return (messages, toolNames) => {
    const key = JSON.stringify(messages);
    if (!seen.has(key)) seen.set(key, callLlm(messages, toolNames));
    return seen.get(key) as Reply;
  };
}

export function sortInbox(emails: Email[], callLlm: CallLlm): string {
  const counts: Record<string, number> = {};
  for (const mail of emails) {
    const reply = callLlm([{ role: "user", content: SORT_RULE + mail.subject }], []);
    const label = reply.text || "other";
    counts[label] = (counts[label] || 0) + 1;
  }
  const parts: string[] = [];
  for (const label in counts) parts.push(label + " " + counts[label]);
  return parts.join(", ");
}

// An amount is a number with three or more digits, such as 18000.
export function amountsIn(text: string): string[] {
  const found: string[] = [];
  let current = "";
  for (const letter of text + " ") {
    if (letter >= "0" && letter <= "9") {
      current += letter;
      continue;
    }
    if (current.length >= 3) found.push(current);
    current = "";
  }
  return found;
}

// The check lives in our code. A reply must hold each amount of the mail, and add none.
export function replyProblems(reply: string, body: string): string[] {
  const problems: string[] = [];
  for (const amount of amountsIn(body)) {
    if (!reply.includes(amount)) problems.push(`the amount ${amount} is missing`);
  }
  for (const amount of amountsIn(reply)) {
    if (!body.includes(amount)) problems.push(`the amount ${amount} is not in the email`);
  }
  if (!reply.includes("Juniper Studio")) problems.push("the reply is not signed Juniper Studio");
  return problems;
}

// Ask a model to draft the reply. A second try names the problems of the first.
export function draftReply(mailId: string, callLlm: CallLlm, problems: string[] = []): string {
  const mail = mailById(mailId);
  let prompt = "REPLY: " + mailId;
  prompt += "\nWrite a short reply. Thank the sender, name the amount, sign Juniper Studio.";
  if (mail) prompt += "\nEMAIL: " + mail.body;
  if (problems.length > 0) prompt += "\nPROBLEMS: " + problems.join("; ");
  return callLlm([{ role: "user", content: prompt }], []).text || "";
}

// ---- Receipts and bank lines (chain and delegate lab) ----
const ONE_DAY = 86400000;

export function receiptById(id: string): Receipt | undefined {
  for (const receipt of RECEIPTS) {
    if (receipt.id === id) return receipt;
  }
  return undefined;
}

// The bank line with the same money and a date within a day. "none" when no line fits.
export function bankLineFor(receipt: Receipt): string {
  for (const line of BANK) {
    if (line.currency !== receipt.currency) continue;
    if (line.amount !== receipt.amount) continue;
    if (Math.abs(Date.parse(line.date) - Date.parse(receipt.date)) > ONE_DAY) continue;
    return line.id;
  }
  return "none";
}

// ---- Pitch research ----
// Four sources each know one thing about the rival of a prospect.
export const PITCH_SOURCES = ["site", "social", "pricing", "clients"];
export const PROSPECTS: Record<string, Record<string, string>> = {
  "prospect-bakery": {
    site: "Corner Loaf has a slow site with no online orders",
    social: "Corner Loaf posts twice a week and gets few replies",
    pricing: "Corner Loaf sells a loaf for 6 dollars",
    clients: "Corner Loaf sells to offices and two schools",
  },
  "prospect-gym": {
    site: "Iron Harbor has a clean site with online booking",
    social: "Iron Harbor posts daily and runs a members group",
    pricing: "Iron Harbor charges 45 dollars a month",
    clients: "Iron Harbor sells to young families",
  },
};

// ---- The receipt in a mail (handoffs lab) ----
export function receiptForMail(mailId: string): Receipt | undefined {
  if (mailId === "mail-receipt") return receiptById("receipt-fontshop");
  return undefined;
}

// ---- CI logs (subagent isolation lab) ----
// Forty build logs. Most are quiet. Build 2, 3 and 17 fail.
export function allLogs(): Record<string, string> {
  const logs: Record<string, string> = {};
  for (const id in CI_LOGS) logs[id] = quiet(CI_LOGS[id]);
  for (let number = 4; number <= 40; number++) {
    let text = quiet("ok: 41 tests passed");
    if (number === 17) text += "\nFAIL: tests/upload.test.ts timed out after 30s";
    logs[`build-${number}`] = text;
  }
  return logs;
}

function quiet(last: string): string {
  const lines: string[] = [];
  for (let step = 1; step <= 8; step++) lines.push(`ok: step ${step} ran with no problem`);
  lines.push(last);
  return lines.join("\n");
}
