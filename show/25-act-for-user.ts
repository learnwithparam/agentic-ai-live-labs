// What you see on screen for the acting for a user lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/25-act-for-user.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { actForUser, actNaive, tokenForUser } from "../labs/25-act-for-user";
import { CRM } from "../src/data";

const DOSE = "What is the dose of Cardioza?";
const US_DOSE = "What is the Cardioza dose in the US?";
const NOW = 1000;

export const lab: Lab = {
  file: "25-act-for-user.ts",
  title: "Act for the user",
  about:
    "Each example is one doctor asking the bot a question. Pick the doctor with --hcp: H-1 is Dr. Lee in the US, H-2 is Dr. Weber in Germany. The bot carries a token that names her, and the search uses her country.",
  terms: "act for = do a job as a named person. delegation = a person lets a bot act for her. service key = one shared key with no person on it.",
  challenge: "A bot on its own key answers as typed. A German doctor who asks about the US label gets the US dose, which is wrong for her.",
  promise: "The bot searches only the country of the doctor its token names. What the doctor or the model types cannot change it. A bad token answers nothing.",
  production: "Issue the token when the doctor signs in, and keep it short. Pass it on every call, and log the doctor with each one.",
  cases: [
    { title: "NAIVE: the bot's own key", why: "Dr. Weber is in Germany and asks about the US. The service key searches the US, so she gets 10mg, the wrong label for her.", question: US_DOSE, flags: { hcp: "H-2", naive: "true" }, expect: "wrong-label" },
    { title: "A US doctor", why: "The token names Dr. Lee. The search uses US, and she gets the US label.", question: DOSE, flags: { hcp: "H-1" }, expect: "own-label" },
    { title: "A German doctor", why: "The token names Dr. Weber. The search uses DE, and she gets 5mg.", question: DOSE, flags: { hcp: "H-2" }, expect: "own-label" },
    { title: "EDGE: she asks about the US", why: "The country comes from her record, not from her words. She still gets the German label.", question: US_DOSE, flags: { hcp: "H-2" }, expect: "own-label" },
    { title: "EDGE: a doctor who is not in the CRM", why: "The token is real, but nobody by that id exists. Nothing is searched.", question: DOSE, flags: { hcp: "H-9" }, expect: "denied" },
    { title: "EDGE: a token changed to another doctor", why: "Someone edits Dr. Weber's token to say H-1. The signature breaks, so nothing runs.", question: DOSE, flags: { hcp: "H-2", forge: "true" }, expect: "denied" },
    { title: "EDGE: a bot that may not read documents", why: "The report bot's token has no docs.read, even for a real doctor.", question: DOSE, flags: { hcp: "H-1", bot: "report" }, expect: "denied" },
  ],
  play(question, flags) {
    const hcp = flags.hcp || "H-1";
    const doctor = CRM[hcp];
    print(field("Question", question));
    print(field("Doctor", doctor ? `${doctor.name}, country ${doctor.country}` : `${hcp} (not in the CRM)`));
    let result;
    if (flags.naive) result = actNaive(question, askedCountry(question, doctor.country), modelFrom(flags));
    else result = actForUser(tokenFor(hcp, flags), question, modelFrom(flags), NOW);
    rule("LOG, STEP BY STEP");
    for (const line of result.log) console.log(dim(line));
    console.log();
    print(field("Answer", result.answer));
    return judge(result.outcome, result.answer, doctor ? doctor.country : "");
  },
};

// The naive app reads the country from the request, as typed.
function askedCountry(question: string, fallback: string): string {
  if (question.includes("the US")) return "US";
  return fallback;
}

function tokenFor(hcp: string, flags: Record<string, string>): string {
  const token = tokenForUser(flags.bot || "answer", hcp, NOW);
  if (!flags.forge) return token;
  const claims = { bot: "answer", scopes: ["docs.read"], expires: NOW + 300, user: "H-1" };
  return `${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${token.split(".")[1]}`;
}

function judge(outcome: string, answer: string, country: string): string {
  if (outcome === "denied") {
    box(badgeRed("DENIED"), [red("Nothing was searched.")], red);
    return "denied";
  }
  const wrong = country === "DE" ? "DOC-101" : "DOC-102";
  if (answer.includes(wrong)) {
    box(badgeRed("WRONG LABEL"), [red("The doctor got a label from another country.")], red);
    return "wrong-label";
  }
  box(badgeGreen("OWN LABEL"), [green("The doctor got the label for her own country.")], green);
  return "own-label";
}
