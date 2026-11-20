// Client intake data for the history trimming lab. The names and numbers are invented.
// It also holds the reader that finds facts in a message. The pretend model uses it.

import type { Turn } from "../labs/11-history-trimming";

export const FIELDS = ["budget", "deadline", "scope", "contact"];
export const NOT_KNOWN = "not known yet";

// The facts in one message. A real model reads the message. This one looks for a few phrases.
export function factsIn(line: string): Record<string, string> {
  const facts: Record<string, string> = {};
  const budget = line.match(/budget (?:is|of) (\$[\d,]+)/i);
  const deadline = line.match(/deadline is (?:now )?(\w+)/i);
  const scope = line.match(/We need ([^.]+)\./);
  const contact = line.match(/([\w.]+@[\w.]+)/);
  if (budget) facts.budget = budget[1];
  if (deadline) facts.deadline = deadline[1];
  if (scope) facts.scope = scope[1];
  if (contact) facts.contact = contact[1];
  const given = line.match(/^(budget|deadline|scope|contact): (.+)$/);
  if (given && given[2] !== NOT_KNOWN) facts[given[1]] = given[2];
  return facts;
}

// The model answers "budget=$6000; deadline=Friday". This reads that answer back.
export function parseFacts(reply: string): Record<string, string> {
  const facts: Record<string, string> = {};
  for (const part of reply.split("; ")) {
    const pieces = part.split("=");
    if (pieces.length === 2 && FIELDS.includes(pieces[0])) facts[pieces[0]] = pieces[1];
  }
  return facts;
}

const TOPICS = [
  "the colours", "the photos", "the opening hours", "the menu card", "the shop sign",
  "the fonts", "the lunch special", "the weekend rush", "the gift boxes", "the window display",
];

// Small talk: a client message and a bot reply, so every pair adds two messages.
function chatter(pairs: number): Turn[] {
  const turns: Turn[] = [];
  for (let pair = 0; pair < pairs; pair++) {
    const topic = TOPICS[pair % TOPICS.length];
    turns.push({ from: "Client", text: `One more thought about ${topic}.` });
    turns.push({ from: "Bot", text: `Noted. We will keep ${topic} in mind.` });
  }
  return turns;
}

const SCOPE: Turn = { from: "Client", text: "Hi, I am Priya from Bloom Bakery. We need a new logo and a one-page site." };
const ASK_BUDGET: Turn = { from: "Bot", text: "Welcome, Priya. What budget do you have in mind?" };
const BUDGET: Turn = { from: "Client", text: "Our budget is $6000." };
const ASK_DEADLINE: Turn = { from: "Bot", text: "Thanks. When do you need it?" };
const DEADLINE: Turn = { from: "Client", text: "The deadline is Friday." };
const ASK_CONTACT: Turn = { from: "Bot", text: "Good. How can we reach you?" };
const CONTACT: Turn = { from: "Client", text: "You can reach me at priya@bloom.example." };
const CHANGE: Turn = { from: "Client", text: "Sorry, the deadline is now Monday." };

// The chat before the last question. Each scene is a different client conversation.
export function intakeChat(name: string): Turn[] | undefined {
  if (name === "short") return [SCOPE, ASK_BUDGET, BUDGET, ASK_DEADLINE, DEADLINE, ASK_CONTACT, CONTACT];
  if (name === "long") {
    return [SCOPE, ASK_BUDGET, BUDGET, ASK_DEADLINE, DEADLINE, ...chatter(4), ASK_CONTACT, CONTACT, ...chatter(3)];
  }
  if (name === "changed") {
    return [SCOPE, ASK_BUDGET, BUDGET, ASK_DEADLINE, DEADLINE, ...chatter(3), CHANGE, ...chatter(1), ASK_CONTACT, CONTACT];
  }
  if (name === "no-budget") return [SCOPE, ASK_DEADLINE, DEADLINE, ASK_CONTACT, CONTACT, ...chatter(4)];
  if (name === "new") return [];
  return undefined;
}

export const CHAT_NAMES = ["short", "long", "changed", "no-budget", "new"];
