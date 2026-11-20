// Handing work between bots
//
// A doctor writes: "Email Dr. Lee the dose of Cardioza." The intake bot sorts the message.
// The outreach bot writes emails. It needs a dose, so it hands the message to the answer bot.
// The answer bot gives doses, but the message asks for an email, so it hands it back.
// Without a guard, the two bots pass the message back and forth for ever.
// So every message travels in an envelope. The envelope counts the hops and lists the bots it met.
// Too many hops, or a bot met twice, and the message goes to a person.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/33-handoffs.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab handoffs --question "Please email Dr. Lee the dose of Cardioza." --hcp dr-lee --naive
//   bun run lab handoffs --question "What is the dose of Cardioza for Dr. Lee?" --hcp dr-lee
//   bun run lab handoffs --question "Please email Dr. Weber about the new Cardioza label." --hcp dr-weber
//   bun run lab handoffs --question "Please email Dr. Lee the dose of Cardioza." --hcp dr-lee
//   bun run lab handoffs --question "Please call me back about my last invoice." --hcp dr-lee
//   bun run lab handoffs --question "What is the dose of Cardioza for Dr. Lee?" --hcp dr-lee --limit 0
//   bun run lab handoffs --demo

import { CRM } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { runAgentLoop } from "./01-agent-loop";
import { draftEmail } from "./21-crash-and-resume";

export type Envelope = { id: string; task: string; hcpId: string; hops: number; path: string[] };
export type Handled = { outcome: string; reply: string; envelope: Envelope; log: string[] };
const NAMES = ["answer", "outreach", "human", "done"];
const JOBS: Record<string, string> = {
  intake: "You only sort messages. Say outreach for an email, answer for a dose, else human.",
  answer: "You give doses. Say done if the message only needs a dose. For an email, say outreach.",
  outreach: "You write emails. Say done if it needs only an email. For a dose, say answer.",
};

// Pass a message from bot to bot. Read the steps in order.
export function handOff(task: string, hcpId: string, callLlm: CallLlm, limit = 4): Handled {
  // Step 1: wrap the task in an envelope. It starts at the intake bot, with no hops yet.
  const id = `msg-${Date.now()}`;
  const envelope: Envelope = { id, task, hcpId, hops: 0, path: ["intake"] };
  const log = ["Step 1: sealed the message in an envelope at the intake bot."];
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

function askBot(bot: string, task: string, callLlm: CallLlm): string {
  const rule = "Reply with one word: answer, outreach, human or done.";
  const prompt = `HAND: You are the ${bot} bot. ${JOBS[bot]}\n${rule}\nMessage: ${task}`;
  return callLlm([{ role: "user", content: prompt }], []).text || "";
}

function nameFrom(said: string, bot: string): string {
  const name = said.trim().toLowerCase().replaceAll(".", "");
  if (name === "done" && bot === "intake") return "human";
  if (NAMES.includes(name)) return name;
  return "human";
}

// The bot that said done does its own work, and its work is the reply.
function finish(bot: string, envelope: Envelope, callLlm: CallLlm, log: string[]): Handled {
  const country = CRM[envelope.hcpId].country;
  let reply = draftEmail(envelope.hcpId, callLlm);
  const { task, hcpId } = envelope;
  if (bot === "answer") reply = runAgentLoop(task, country, callLlm, undefined, 5, hcpId).answer;
  log.push(`Step 6: the ${bot} bot finished after ${envelope.hops} hops.`);
  return { outcome: "delivered", reply, envelope, log };
}

function stopped(why: string, envelope: Envelope, log: string[], outcome = "stopped"): Handled {
  const reply = `A PERSON MUST LOOK AT THIS: ${why}. Path: ${envelope.path.join(" -> ")}`;
  return { outcome, reply, envelope, log };
}

// The naive way: no envelope, no count. A safety stop of 12 rounds is the only end.
export function handOffNaive(task: string, hcpId: string, callLlm: CallLlm): Handled {
  const envelope: Envelope = { id: "none", task, hcpId, hops: 0, path: ["intake"] };
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

function ended(envelope: Envelope): Handled {
  return { outcome: "delivered", reply: "", envelope, log: [] };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/33-handoffs");
  runLab(lab);
}
