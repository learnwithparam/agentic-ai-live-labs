// What you see on screen for lab 33: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/33-handoffs.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { handOff, handOffNaive } from "../labs/33-handoffs";

const LOOP = "Please email Dr. Lee the dose of Cardioza.";
const DOSE = "What is the dose of Cardioza for Dr. Lee?";

export const lab: Lab = {
  file: "33-handoffs.ts",
  title: "Lab 33: handing work between bots",
  about:
    "Each example sends one message through a team of bots: intake, answer and outreach. Pick the doctor with --hcp. Change the hop limit with --limit.",
  terms: "handoff = one bot passes work to another. envelope = the wrapper that travels with the message. hop = one handoff. loop breaker = a rule that stops a message that goes in circles.",
  challenge: "Two bots can each think the other should do the work. The message goes back and forth for ever, and no doctor gets a reply.",
  promise: "Every message travels in an envelope. It stops at the hop limit, or when it meets a bot twice, and a person gets it with the path it took.",
  production: "Put the envelope on a queue, with its id, hop count and path. Alert a person when a message is stopped. Keep the limit small, because real work rarely needs many hops.",
  cases: [
    { title: "NAIVE: no envelope, no count", why: "The outreach bot and the answer bot pass the message back and forth until we cut it off.", question: LOOP, flags: { hcp: "H-1", naive: "true" }, expect: "looped" },
    { title: "A dose goes to the answer bot", why: "Intake sends it to the answer bot, which gives the dose.", question: DOSE, flags: { hcp: "H-1" }, expect: "delivered" },
    { title: "An email goes to the outreach bot", why: "Intake sends it to the outreach bot, which writes the email.", question: "Please email Dr. Weber about the new Cardioza label.", flags: { hcp: "H-2" }, expect: "delivered" },
    { title: "EDGE: two bots send it back and forth", why: "The envelope sees the outreach bot a second time and stops. A person gets the path.", question: LOOP, flags: { hcp: "H-1" }, expect: "stopped" },
    { title: "EDGE: a message that fits no bot", why: "The intake bot has no bot for an invoice, so a person gets it at once.", question: "Please call me back about my last invoice.", flags: { hcp: "H-1" }, expect: "human" },
    { title: "EDGE: the hop limit is tiny", why: "The limit is zero hops. Even the first handoff is refused, though nothing is wrong.", question: DOSE, flags: { hcp: "H-1", limit: "0" }, expect: "stopped" },
  ],
  play(question, flags) {
    const callLlm = modelFrom(flags);
    const hcp = flags.hcp || "H-1";
    print(field("Message", question));
    let done;
    if (flags.naive) done = handOffNaive(question, hcp, callLlm);
    else done = handOff(question, hcp, callLlm, Number(flags.limit || 4));
    rule("LOG, STEP BY STEP");
    for (const line of done.log) console.log(dim(line));
    print(field("Path", done.envelope.path.join(" -> ")));
    print(field("Hops", String(done.envelope.hops)));
    print(field("Reply", done.reply.slice(0, 120)));
    if (done.outcome === "looped") box(badgeRed("LOOPED"), [red("The message never stopped moving.")], red);
    else if (done.outcome === "delivered") box(badgeGreen("DELIVERED"), [green("A bot finished the job.")], green);
    else box(badgeGreen("A PERSON HAS IT"), [green("The message did not loop. It went to a person.")], green);
    return done.outcome;
  },
};
