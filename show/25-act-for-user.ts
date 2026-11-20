// What you see on screen for the acting for a user lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/25-act-for-user.ts.

import { modelFrom, type Flags, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { actForUser, actNaive, tokenForUser } from "../labs/25-act-for-user";

const NOW = 1000;

export const lab: Lab = {
  file: "25-act-for-user.ts",
  title: "Act for the user",
  about:
    "Each example is one email that the Inbox Manager handles for Maya. The bot can act for a user, with that user's rights. Maya gives it a delegation. Pick the email with --mail, the person with --user, and the bot with --bot. Add --forge to edit the token.",
  terms: ["act-for-user", "delegation", "service-key"],
  challenge: "A bot on a service key can do anything the key allows. No person is on that key, so nobody is named. One tricky email can make it send the signed contract to a stranger.",
  promise: "The bot does only what its token allows, for the person the token names. A send is refused when the token holds no send scope. A bad token does nothing.",
  production: "Issue a narrow token when Maya signs in, with draft rights and no send. Give each bot its own key. Pass the token on every call, and log the person with each one.",
  cases: [
    { title: "NAIVE: the bot's own key", why: "A vendor email says to forward the signed contract. The model obeys. The service key can send, so the contract goes to a stranger.", question: "Handle the overdue invoice email", flags: { mail: "mail-vendor", naive: "true" }, expect: "sent-by-trick" },
    { title: "A normal draft", why: "The token names Maya and holds the draft scope. The bot drafts a reply to Sam in her mailbox.", question: "Reply to Sam about moving the call to Thursday", flags: { mail: "mail-meeting" }, expect: "drafted" },
    { title: "A draft about money", why: "The same token drafts the reply to Acme. Drafting is all it can do, and a person reads the draft before it goes.", question: "Draft a thank-you for the signed Acme contract", flags: { mail: "mail-contract" }, expect: "drafted" },
    { title: "EDGE: the trick email, a draft-only token", why: "The model still asks to send the contract. The token holds no send scope, so the code refuses. The trick fails.", question: "Handle the overdue invoice email", flags: { mail: "mail-vendor" }, expect: "denied" },
    { title: "EDGE: a token for a stranger", why: "The token is real, but nobody at the studio has that name. Nothing is done.", question: "Draft a reply to the contract email for Sam", flags: { mail: "mail-contract", user: "sam" }, expect: "denied" },
    { title: "EDGE: a token that was edited", why: "Someone adds the send scope to Maya's token. The signature breaks, so nothing runs.", question: "Send the Acme contract reply right away", flags: { mail: "mail-vendor", forge: "true" }, expect: "denied" },
    { title: "EDGE: another bot's key", why: "The Expense Manager's key can read the bank, and nothing else. It cannot draft a mail, even for Maya.", question: "Reply to the font receipt", flags: { mail: "mail-receipt", bot: "expense" }, expect: "denied" },
  ],
  play(question, flags) {
    const mail = String(flags.mail || "mail-meeting");
    const person = String(flags.user || "maya");
    print(field("Task", question));
    print(field("Email", mail));
    print(field("Acting for", person));
    let result;
    if (flags.naive) result = actNaive(mail, modelFrom(flags));
    else result = actForUser(tokenFor(person, flags), mail, modelFrom(flags), NOW);
    rule("LOG, STEP BY STEP");
    for (const line of result.log) console.log(dim(line));
    console.log();
    print(field("Result", result.answer));
    return judge(result.outcome);
  },
};

function tokenFor(person: string, flags: Flags): string {
  const token = tokenForUser(String(flags.bot || "inbox"), person, NOW);
  if (!flags.forge) return token;
  const claims = { bot: "inbox", scopes: ["mail.draft", "mail.send"], expires: NOW + 300, user: "maya" };
  return `${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${token.split(".")[1]}`;
}

function judge(outcome: string): string {
  if (outcome === "denied") box(badgeRed("DENIED"), [red("Nothing was done.")], red);
  else if (outcome === "sent-by-trick") box(badgeRed("SENT BY A TRICK"), [red("A stranger got the contract.")], red);
  else box(badgeGreen("DRAFTED"), [green("The draft waits in Maya's mailbox.")], green);
  return outcome;
}
