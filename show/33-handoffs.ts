// What you see on screen for the handoffs lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/33-handoffs.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { handOff, handOffChat, handOffNaive } from "../labs/33-handoffs";

const BOTH = "File the receipt and reply to the sender.";
const FILE = "File the receipt from FontShop.";

export const lab: Lab = {
  file: "33-handoffs.ts",
  title: "Handing work between bots",
  about:
    "Each example sends one mail through a team of bots: inbox, expense and a reply writer. Each handoff passes it to the next bot in an envelope. Pick the mail with --mail, and change the hop limit with --limit.",
  terms: ["handoff", "envelope", "hop", "loop-breaker"],
  challenge: "Two bots can each think the other should do the work. The message goes back and forth, and the sender gets no reply. A pasted chat log also loses the amount.",
  promise: "Every message travels in an envelope with the receipt and its amount. It stops at the hop limit, or when it meets a bot twice. Then a person gets it, with the list of bots it met.",
  production: "Put the envelope on a queue, with its id, hop count and path. A loop breaker alerts Maya when a message is stopped. Keep the limit small. A lead that hands work down to bots is easy to stop. Bots that react to events, such as draft rejected, need the same hop count.",
  cases: [
    { title: "NAIVE: no envelope, no count", why: "The expense bot and the reply bot pass the message back and forth until we cut it off.", question: BOTH, flags: { mail: "mail-receipt", naive: "true" }, expect: "looped" },
    { title: "NAIVE: a pasted chat log", why: "The expense bot only gets the chat text. The amount from the font receipt never arrives.", question: FILE, flags: { mail: "mail-receipt", chat: "true" }, expect: "lost" },
    { title: "A receipt goes to the expense bot", why: "The inbox bot sends it to the expense bot. The envelope carries 12.5 USD to the books.", question: FILE, flags: { mail: "mail-receipt" }, expect: "delivered" },
    { title: "A reply goes to the reply bot", why: "The inbox bot sends the contract mail to the reply bot, which writes the answer.", question: "Reply to the client who sent the contract.", flags: { mail: "mail-contract" }, expect: "delivered" },
    { title: "EDGE: two bots send it back and forth", why: "The envelope sees the expense bot a second time and stops. A person gets the path.", question: BOTH, flags: { mail: "mail-receipt" }, expect: "stopped" },
    { title: "EDGE: a message that fits no bot", why: "The inbox bot has no bot for a parking ticket, so a person gets it at once.", question: "Please pay my parking ticket.", flags: { mail: "mail-probe" }, expect: "human" },
    { title: "EDGE: the hop limit is tiny", why: "The limit is zero hops. Even the first handoff is refused, though nothing is wrong.", question: FILE, flags: { mail: "mail-receipt", limit: "0" }, expect: "stopped" },
  ],
  play(question, flags) {
    const callLlm = modelFrom(flags);
    const mail = flags.mail || "mail-receipt";
    print(field("Message", question));
    let done;
    if (flags.naive) done = handOffNaive(question, mail, callLlm);
    else if (flags.chat) done = handOffChat(question, mail);
    else done = handOff(question, mail, callLlm, Number(flags.limit || 4));
    rule("LOG, STEP BY STEP");
    for (const line of done.log) console.log(dim(line));
    print(field("Path", done.envelope.path.join(" -> ")));
    print(field("Hops", String(done.envelope.hops)));
    print(field("Amount in the envelope", done.envelope.amount));
    print(field("Reply", done.reply.slice(0, 120)));
    if (done.outcome === "looped") box(badgeRed("LOOPED"), [red("The message never stopped moving.")], red);
    else if (done.outcome === "lost") box(badgeRed("LOST"), [red("The reply has no amount.")], red);
    else if (done.outcome === "delivered") box(badgeGreen("DELIVERED"), [green("A bot finished the job.")], green);
    else box(badgeGreen("A PERSON HAS IT"), [green("The message did not loop. It went to a person.")], green);
    return done.outcome;
  },
};
