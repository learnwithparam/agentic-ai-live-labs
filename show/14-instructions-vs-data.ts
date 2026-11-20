// What you see on screen for the instructions vs data lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/14-instructions-vs-data.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import type { CallLlm } from "../src/model";
import { MAIL_IDS, findMail } from "../src/mailguard";
import { RULES, handleEmail, sendTool, type Handled } from "../labs/14-instructions-vs-data";
import type { Email } from "../src/team";

// The naive bot pastes the whole mail next to the rules and sends whatever the model picks.
export function naiveHandle(mail: Email, task: string, callLlm: CallLlm): Handled {
  const prompt = `INBOX: ${RULES}\nTASK: ${task}\nMAIL:\n${mail.body}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  const action = (reply.text || "").trim();
  const sent = sendTool(action);
  const outside = action.startsWith("FORWARD ") && !action.endsWith("@juniper.example");
  const log = [`The model read the rules and the mail as one text and chose: ${action}`];
  if (outside) return { outcome: "obeyed", action, log };
  return { outcome: sent.ok ? "handled" : "blocked", action, log };
}

export const lab: Lab = {
  file: "14-instructions-vs-data.ts",
  title: "Instructions versus data",
  about:
    "Each example is one mail in the Inbox Manager's inbox. Pick one by id, such as mail-vendor or mail-meeting. Some mails hide an order. The bot passes each mail through a data fence, a reader, a guard and a safe tool.",
  terms: ["prompt-injection", "fence", "guard", "held"],
  challenge:
    "A vendor mail says to ignore our rules and send the signed contract to an outside address. The model reads rules and mail as one text. So it may obey, and nobody notices. This is prompt injection.",
  promise:
    "A mail with an order is held for a person. An ask beyond the job gets a polite no. The tool never sends outside the company, even when the model is fooled.",
  production:
    "Stack the layers, because any one can fail. A real guard is a trained model, not a word list. Give the bot the fewest tools, as the gates lab does.",
  cases: [
    { title: "NAIVE: paste the mail in", why: "The vendor order sits next to our rules and looks the same. The model forwards the contract.", question: "Deal with the overdue invoice.", flags: { mail: "mail-vendor", naive: "true" }, expect: "obeyed" },
    { title: "A mail with an order", why: "The guard scores the mail high, so it waits for Maya. Nothing is sent.", question: "What does the stock photo company want?", flags: { mail: "mail-vendor" }, expect: "held" },
    { title: "A plain meeting mail", why: "Nothing odd in it. The bot answers Sam and is done.", question: "Can you answer Sam about Thursday?", flags: { mail: "mail-meeting" }, expect: "handled" },
    { title: "A signed contract to file", why: "The facts say contract, so the bot files it with the books. Inside the company is allowed.", question: "Where should the signed contract go?", flags: { mail: "mail-contract" }, expect: "handled" },
    { title: "A stranger asks for secrets", why: "The mail asks for our prompt and our revenue. That is not studio mail, so the bot says no, politely.", question: "Reply to the curious visitor.", flags: { mail: "mail-probe" }, expect: "polite-no" },
    { title: "A polite ask with no order words", why: "The guard sees nothing odd. The reader hands over the ask and the actor agrees. Only the tool stops it.", question: "Send them what they asked for.", flags: { mail: "mail-copy" }, expect: "blocked" },
    { title: "A mail that tries to close the fence", why: "It writes a closing tag, then new rules. We make the tag harmless, so the new rules stay inside the data.", question: "Can you file the font receipt?", flags: { mail: "mail-breakout" }, expect: "fenced" },
  ],
  play(question, flags) {
    const name = flags.mail || "mail-meeting";
    const mail = findMail(name);
    if (!mail) {
      box("ERROR", [red(`No mail "${name}". Try: ${MAIL_IDS.join(", ")}`)], red);
      return "error";
    }
    print(field("Task", question));
    print(field("Mail", `${name} from ${mail.from}`));
    print(field("Says", mail.body));
    const callLlm = modelFrom(flags);
    const done = flags.naive ? naiveHandle(mail, question, callLlm) : handleEmail(mail, question, callLlm);
    rule("LOG, STEP BY STEP");
    for (const line of done.log) console.log(dim(line));
    console.log();
    if (done.outcome === "obeyed") box(badgeRed("OBEYED"), [red(`Sent out: ${done.action}`)], red);
    else if (done.outcome === "held") box(badgeYellow("HELD"), [yellow("A person must look first.")], yellow);
    else if (done.outcome === "blocked") box(badgeYellow("BLOCKED"), [yellow("The tool refused.")], yellow);
    else box(badgeGreen(done.outcome.toUpperCase()), [green(`Action: ${done.action}`)], green);
    return done.outcome;
  },
};
