// PRETEND MODEL for the Juniper Studio bots. You do not need to read this file.
// src/model.ts hands each prompt to opsReply. A prompt starts with a word like RENEW:.
// If the word is not one of ours, opsReply says nothing and the old pretend model goes on.
import { KEY_CLAUSE } from "./renewal";
import { FIELDS, factsIn } from "./intake";
import { boardPlan, nextStep } from "./chief-model";
import { expenseCall } from "./expenses";
import { BAD_CV, FLAKY_CV } from "./screening";
import { addressIn, BOOKS, mailTopic, readFacts } from "./mailguard";

export function opsReply(first: string): string | undefined {
  if (first.startsWith("RENEWNOTE:")) return noteFor(first);
  if (first.startsWith("RENEW:")) return renewFor(first);
  if (first.startsWith("BRIEF:")) return briefFor(first);
  if (first.startsWith("INTAKE:")) return intakeFor(first);
  if (first.startsWith("READ:")) return readerFor(first);
  if (first.startsWith("INBOX:")) return inboxFor(first);
  if (first.startsWith("FILE:")) return expenseCall(first);
  if (first.startsWith("SCREEN:")) return screenFor(first);
  if (first.startsWith("BOARD:")) return boardPlan(first);
  if (first.startsWith("NEXT:")) return nextStep(first);
  return undefined;
}

// A model asked for a one-line note. It keeps the first words of the new text. This loses detail.
function noteFor(prompt: string): string {
  const text = prompt.split("\nNEW:\n")[1] || "";
  const words = text.replace(/\n/g, " ").split(" ").slice(0, 14);
  return words.join(" ") + " ...";
}

// A real model misses text in the middle of a long prompt. This one does too.
const LONG_PROMPT = 8000; // characters
function renewFor(prompt: string): string {
  const question = (prompt.split("QUESTION: ")[1] || "").toLowerCase();
  if (question.includes("promise")) {
    const last = prompt.lastIndexOf("Maya promised");
    if (last < 0) return "I do not have the call notes.";
    const start = prompt.lastIndexOf("\n", last) + 1;
    return prompt.slice(start).split("\n")[0];
  }
  const found = prompt.indexOf("Clause 7:");
  if (found < 0) return "I do not have the contract.";
  const share = found / prompt.length;
  if (prompt.length > LONG_PROMPT && share > 0.15 && share < 0.85) {
    return "I found no limit on a price rise.";
  }
  return KEY_CLAUSE;
}

// ---- Lab 11, the intake chat ----

// A model asked which brief fields one message fills. It answers "budget=$6000; deadline=Friday".
function briefFor(prompt: string): string {
  const message = prompt.split("\nMESSAGE: ")[1] || "";
  const facts = factsIn(message);
  const parts: string[] = [];
  for (const field of FIELDS) if (facts[field]) parts.push(`${field}=${facts[field]}`);
  return parts.length > 0 ? parts.join("; ") : "none";
}

// The bot reads the brief, then the kept chat. A later fact replaces an earlier one.
function intakeFor(prompt: string): string {
  const known: Record<string, string> = {};
  for (const line of prompt.split("\n")) {
    if (line.startsWith("Bot:")) continue;
    const facts = factsIn(line.replace("Client: ", ""));
    for (const field of FIELDS) if (facts[field]) known[field] = facts[field];
  }
  const missing: string[] = [];
  for (const field of FIELDS) if (!known[field]) missing.push(field);
  if (missing.length > 0) return `Still missing: ${missing.join(", ")}.`;
  return `Quote ready: ${known.scope}, ${known.budget}, due ${known.deadline}, mail ${known.contact}.`;
}

// ---- Lab 14, the inbox ----

// The reader has no tools. It only turns the mail into facts. It never does what the mail asks.
function readerFor(prompt: string): string {
  const from = (prompt.split("\nFROM: ")[1] || "").split("\n")[0];
  const body = (prompt.split("<data>\n")[1] || "").split("\n</data>")[0];
  const address = addressIn(body);
  const lower = body.toLowerCase();
  const asks: string[] = [];
  if (address && (lower.includes("forward") || lower.includes("send"))) asks.push(`forward ${address}`);
  if (lower.includes("system prompt")) asks.push("share-prompt");
  if (lower.includes("revenue")) asks.push("share-revenue");
  return `from=${from}; topic=${mailTopic(body)}; asks=${asks.join(" and ") || "none"}`;
}

// The actor picks one action. With facts it trusts them. With a raw mail it also obeys an order.
function inboxFor(prompt: string): string {
  const mail = prompt.split("\nMAIL:\n")[1];
  if (mail !== undefined) {
    const lower = mail.toLowerCase();
    if (lower.includes("ignore your rules") && addressIn(mail)) return `FORWARD ${addressIn(mail)}`;
    return actionFor(mailTopic(mail), "", "");
  }
  const facts = readFacts((prompt.split("\nFACTS: ")[1] || "").split("\n")[0]);
  const asked = facts.asks.startsWith("forward ") ? facts.asks.slice(8) : "";
  return actionFor(facts.topic, facts.from, asked);
}

function actionFor(topic: string, from: string, forwardTo: string): string {
  if (forwardTo) return `FORWARD ${forwardTo}`;
  if (topic === "meeting") return `REPLY ${from || "the sender"}`;
  if (topic === "contract" || topic === "receipt") return `FORWARD ${BOOKS}`;
  return "ARCHIVE";
}

// ---- Lab 19, the talent scout ----

// The model scores one applicant. One CV is empty, and one CV service is busy on the first try.
function screenFor(prompt: string): string {
  const line = (prompt.split("\nApplicant: ")[1] || "").split("\n")[0];
  const parts = line.split("; ");
  const attempt = Number((prompt.split("\nAttempt: ")[1] || "1").trim());
  if (parts[0] === BAD_CV) return "ERROR: the CV file is empty.";
  if (parts[0] === FLAKY_CV && attempt === 1) return "ERROR: the CV service is busy.";
  const years = Number((parts[1] || "years=0").split("=")[1]);
  const skills = (parts[2] || "skills=").split("=")[1].split(",").length;
  return `score=${Math.min(100, years * 10 + skills * 8)}`;
}
