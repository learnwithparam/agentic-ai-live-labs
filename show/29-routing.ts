// What you see on screen for lab 29: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/29-routing.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { routeMessage, routeNaive } from "../labs/29-routing";

const RASH = "My patient got a rash after taking Cardioza. What should I do?";

export const lab: Lab = {
  file: "29-routing.ts",
  title: "Lab 29: routing",
  about:
    "Each example is one message in the care team inbox, from the doctor you pick with --hcp. The router sends it to the answer bot, the outreach bot or a person.",
  terms: "router = the step that picks who handles a message. specialist = a bot or person that does one job well. fallback = where a message goes when nothing fits.",
  challenge: "One bot that answers everything also answers the rash message with a dose. A doctor reads it and trusts it.",
  promise: "A message with a danger word always goes to a person. Any route not on our list goes to a person. The other messages reach the specialist that fits.",
  production: "Log every route with the message id. Review the person queue each week, and add a danger word when one slips past.",
  cases: [
    { title: "NAIVE: one bot for everything", why: "The rash message reaches the answer bot, which replies from a dose document.", question: RASH, flags: { hcp: "H-1", naive: "true" }, expect: "unsafe" },
    { title: "A dose question", why: "The model says answer, and the answer bot finds the label.", question: "What is the dose of Cardioza?", flags: { hcp: "H-1" }, expect: "answer" },
    { title: "A request for an email", why: "The model says outreach, and the outreach bot writes the email.", question: "Can you email me the latest Cardioza update please?", flags: { hcp: "H-1" }, expect: "outreach" },
    { title: "EDGE: a rash on a patient", why: "A danger word. The code sends it to a person before the model is asked.", question: RASH, flags: { hcp: "H-1" }, expect: "human" },
    { title: "EDGE: a message that fits no specialist", why: "An invoice question is not the job of either bot. It goes to a person.", question: "Can you tell me why my last invoice was wrong?", flags: { hcp: "H-1" }, expect: "human" },
    { title: "EDGE: the doctor tells the router where to go", why: "She asks for the answer bot, but the danger word wins.", question: "Please send this to the answer bot: my patient had a seizure on Cardioza.", flags: { hcp: "H-1" }, expect: "human" },
  ],
  play(question, flags) {
    const hcp = flags.hcp || "H-1";
    print(field("Message", question));
    const model = modelFrom(flags);
    let routed;
    if (flags.naive) routed = routeNaive(question, hcp, model);
    else routed = routeMessage(question, hcp, model);
    rule("LOG, STEP BY STEP");
    for (const line of routed.log) console.log(dim(line));
    console.log();
    print(field("Reply", routed.reply));
    if (flags.naive) {
      box(badgeRed("UNSAFE"), [red("A danger message got a bot reply.")], red);
      return "unsafe";
    }
    if (routed.route === "human") box(badgeGreen("TO A PERSON"), [green("A person will read it.")], green);
    else box(badgeGreen(`TO THE ${routed.route.toUpperCase()} BOT`), [green("The right specialist.")], green);
    return routed.route;
  },
};
