// Handing work between bots
//
// A mail comes in: "File the receipt and reply to the sender." The inbox bot sorts the message.
// The expense bot files receipts. It also needs a reply, so it hands the message to the inbox bot.
// The inbox bot writes replies, but the message holds a receipt, so it hands it back.
// Without a guard, the two bots pass the message back and forth for ever.
// So every message travels in an envelope. It is a typed packet with the receipt and its amount.
// The envelope counts the hops and lists the bots it met. A pasted chat log would lose the amount.
// Too many hops, or a bot met twice, and the message goes to a person.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/33-handoffs.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab handoffs --question "File the receipt and reply to the sender." --mail mail-receipt --naive
//   bun run lab handoffs --question "File the receipt from FontShop." --mail mail-receipt --chat true
//   bun run lab handoffs --question "File the receipt from FontShop." --mail mail-receipt
//   bun run lab handoffs --question "Reply to the client who sent the contract." --mail mail-contract
//   bun run lab handoffs --question "File the receipt and reply to the sender." --mail mail-receipt
//   bun run lab handoffs --question "File the receipt from FontShop." --mail mail-receipt --limit 0
//   bun run lab handoffs --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { draftReply, receiptForMail } from "../src/juniper";

export type Envelope = {
  task: string; mailId: string; amount: string; hops: number; path: string[];
};
export type Handled = { outcome: string; reply: string; envelope: Envelope; log: string[] };
const NAMES = ["expense", "inbox", "human", "done"];
const JOBS: Record<string, string> = {
  intake: "You only sort messages. Say expense for a receipt, inbox for a reply, else human.",
  expense: "You file receipts. Say done if it only needs filing. For a reply, say inbox.",
  inbox: "You write replies. Say done if it needs only a reply. For a receipt, say expense.",
};

// Pass a message from bot to bot. Read the steps in order.
export function handOff(task: string, mailId: string, callLlm: CallLlm, limit = 4): Handled {
  // Step 1: wrap the task in an envelope. The receipt and its amount ride in typed fields.
  const envelope = seal(task, mailId);
  const log = ["Step 1: sealed the message in an envelope at the inbox bot."];
  let bot = "intake";
  while (true) {
    // Step 2: ask the bot who comes next. The model must reply with one word.
    const said = askBot(bot, task, callLlm);
    // Step 3: only a name on our list counts. Anything else goes to a person.
    const next = nameFrom(said, bot);
    log.push(`Step 2: the ${bot} bot said "${said.trim()}". Step 3: that means ${next}.`);
    if (next === "done") return finish(bot, envelope, callLlm, log);
    // Step 4: count the hop. Past the limit, stop and call a person.
    envelope.hops += 1;
    if (envelope.hops > limit) return stopped("hop limit reached", envelope, log);
    // Step 5: a bot the envelope already met means a loop. Stop and call a person.
    if (next !== "human" && envelope.path.includes(next)) return stopped("a loop", envelope, log);
    envelope.path.push(next);
    bot = next;
    if (next === "human") return stopped("a person was asked for", envelope, log, "human");
  }
}

function seal(task: string, mailId: string): Envelope {
  let amount = "none";
  const receipt = receiptForMail(mailId);
  if (receipt !== undefined) amount = `${receipt.amount} ${receipt.currency}`;
  return { task, mailId, amount, hops: 0, path: ["intake"] };
}

function askBot(bot: string, task: string, callLlm: CallLlm): string {
  const rule = "Reply with one word: expense, inbox, human or done.";
  const prompt = `PASS: You are the ${bot} bot. ${JOBS[bot]}\n${rule}\nMessage: ${task}`;
  return callLlm([{ role: "user", content: prompt }], []).text || "";
}

function nameFrom(said: string, bot: string): string {
  const name = said.trim().toLowerCase().replaceAll(".", "");
  if (name === "done" && bot === "intake") return "human";
  if (NAMES.includes(name)) return name;
  return "human";
}

// The bot that said done does its own work. The expense bot reads the typed fields.
function finish(bot: string, envelope: Envelope, callLlm: CallLlm, log: string[]): Handled {
  let reply = draftReply(envelope.mailId, callLlm);
  if (bot === "expense") reply = `Filed the receipt in ${envelope.mailId} for ${envelope.amount}.`;
  log.push(`Step 6: the ${bot} bot finished after ${envelope.hops} hops.`);
  return { outcome: "delivered", reply, envelope, log };
}

function stopped(why: string, envelope: Envelope, log: string[], outcome = "stopped"): Handled {
  const reply = `A PERSON MUST LOOK AT THIS: ${why}. Path: ${envelope.path.join(" -> ")}`;
  return { outcome, reply, envelope, log };
}

// The naive way: no envelope, no count. A safety stop of 12 rounds is the only end.
export function handOffNaive(task: string, mailId: string, callLlm: CallLlm): Handled {
  const envelope = seal(task, mailId);
  let bot = "intake";
  for (let round = 1; round <= 12; round++) {
    const next = nameFrom(askBot(bot, task, callLlm), bot);
    if (next === "done" || next === "human") return ended(envelope);
    envelope.hops += 1;
    envelope.path.push(next);
    bot = next;
  }
  const reply = "The message was still moving when we cut it off.";
  return { outcome: "looped", reply, envelope, log: [] };
}

// The other naive way: paste the chat so far into the next bot. The amount is not in the chat.
export function handOffChat(task: string, mailId: string): Handled {
  const envelope = seal(task, mailId);
  const reply = `Filed from the chat log: ${task}`;
  let outcome = "lost";
  if (reply.includes(envelope.amount)) outcome = "delivered";
  return { outcome, reply, envelope, log: ["The expense bot got a pasted chat log."] };
}

function ended(envelope: Envelope): Handled {
  return { outcome: "delivered", reply: "", envelope, log: [] };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/33-handoffs");
  runLab(lab);
}
