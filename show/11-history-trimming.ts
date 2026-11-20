// What you see on screen for the history trimming lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/11-history-trimming.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { ask, briefText, chatText, replyAfterTrim, type Turn } from "../labs/11-history-trimming";
import { CHAT_NAMES, intakeChat } from "../src/intake";
import type { CallLlm } from "../src/model";

// The naive way: keep only the last few messages. Old facts go with the old chatter.
export function naiveReply(turns: Turn[], keepLast: number, callLlm: CallLlm): string {
  const kept = keepLast <= 0 ? [] : turns.slice(-keepLast);
  return ask(callLlm, `INTAKE: Answer the last message.\nCHAT:\n${chatText(kept)}`);
}

export const lab: Lab = {
  file: "11-history-trimming.ts",
  title: "Trimming the chat history",
  about:
    "Each example is an intake chat with a new client. The bot must fill a brief with budget, deadline, scope and contact. Pick a chat by name, such as short, long, changed, no-budget or new. Use --keep to change how many recent messages stay.",
  terms: ["history", "trim", "brief"],
  challenge: "The chat gets long, so old messages are cut. The client said the deadline early. After the cut, the bot asks for it again.",
  promise: "The brief keeps every fact the client gave, and the newest answer wins. The prompt holds the brief and only the last messages.",
  production: "Save each fact in the brief the moment it is said, not at trim time. Show the brief to the client and let them fix it.",
  cases: [
    { title: "NAIVE: keep only the last messages", why: "Priya gave the scope, budget and deadline early. Those messages are cut. The bot asks for all three again.", question: "Can you send me the quote today?", flags: { chat: "long", naive: "true", keep: "8" }, expect: "fact-lost" },
    { title: "A short chat", why: "The chat is short. The brief still holds all four facts, so the quote is ready.", question: "What do you need from me next?", flags: { chat: "short", keep: "4" }, expect: "quote-ready" },
    { title: "A long chat, brief kept", why: "More than 20 messages. Only the last four stay. The brief has the deadline, so the quote is ready.", question: "Could you put the price and date in an email?", flags: { chat: "long", keep: "4" }, expect: "quote-ready" },
    { title: "The deadline changes", why: "The client said Friday, then Monday. The newest answer replaces the old one in the brief.", question: "So are we still starting on Monday?", flags: { chat: "changed", keep: "4" }, expect: "quote-ready" },
    { title: "No messages kept", why: "We keep zero recent messages. The brief alone is enough to write the quote.", question: "Please send me the quote.", flags: { chat: "long", keep: "0" }, expect: "quote-ready" },
    { title: "EDGE: the client never gave a budget", why: "The brief has a gap. The bot asks only for the budget and nothing else.", question: "How long will the site take?", flags: { chat: "no-budget", keep: "4" }, expect: "asks: budget" },
    { title: "EDGE: a brand new chat", why: "There is no history. The brief is empty, so the bot asks for all four facts. Nothing breaks.", question: "Hello, are you open for new work?", flags: { chat: "new", keep: "4" }, expect: "asks: budget, deadline, scope, contact" },
  ],
  play(question, flags) {
    const name = flags.chat || "long";
    const before = intakeChat(name);
    if (!before) {
      box("ERROR", [red(`No chat "${name}". Try: ${CHAT_NAMES.join(", ")}`)], red);
      return "error";
    }
    const turns: Turn[] = [...before, { from: "Client", text: question }];
    const keep = Number(flags.keep || 4);
    print(field("Question", question));
    print(field("Chat", `${turns.length} messages, keep the last ${keep}`));
    if (flags.naive) return showNaive(turns, keep, modelFrom(flags));
    const replied = replyAfterTrim(turns, keep, modelFrom(flags));
    rule("LOG, STEP BY STEP");
    for (const line of replied.log) console.log(dim(line));
    console.log();
    rule("THE BRIEF");
    for (const line of briefText(replied.brief).split("\n")) console.log(badgeYellow("BRIEF"), line);
    rule("THE LAST MESSAGES");
    for (const turn of replied.kept) console.log(dim(`${turn.from}: ${turn.text}`));
    return judge(replied.reply);
  },
};

function judge(reply: string): string {
  if (reply.startsWith("Quote ready")) {
    box(badgeGreen("QUOTE READY"), [green(reply)], green);
    return "quote-ready";
  }
  const missing = reply.replace("Still missing: ", "").replace(".", "");
  box("ASKS AGAIN", [yellow(reply)], yellow);
  return `asks: ${missing}`;
}

function showNaive(turns: Turn[], keep: number, callLlm: CallLlm): string {
  const reply = naiveReply(turns, keep, callLlm);
  rule("WHAT THE BOT READS");
  for (const turn of turns.slice(-keep)) console.log(dim(`${turn.from}: ${turn.text}`));
  print(field("Bot", reply));
  if (reply.startsWith("Quote ready")) {
    box(badgeGreen("KEPT"), [green("The facts survived this time.")], green);
    return "fact-kept";
  }
  box(badgeRed("FACT LOST"), [red(`${reply} The client already said these.`)], red);
  return "fact-lost";
}
