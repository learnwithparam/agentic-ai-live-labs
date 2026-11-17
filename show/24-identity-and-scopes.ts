// What you see on screen for the identity and scopes lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/24-identity-and-scopes.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { BOT_SCOPES, runBot, tokenFor } from "../labs/24-identity-and-scopes";
import { botSecret, issue } from "../src/identity";
import type { Decision } from "../labs/24-identity-and-scopes";

const DOSE = "What is the dose of Cardioza?";
const DOSE_AND_EMAIL = "What is the dose of Cardioza, and can you email it to Dr. Lee?";

export const lab: Lab = {
  file: "24-identity-and-scopes.ts",
  title: "Identity and scopes",
  about:
    "Each example sends a doctor's request to one of three bots. Pick the bot with --bot. Each bot proves its identity with a signed token, and the token lists its scopes.",
  terms: ["identity", "scope", "least-privilege", "signed-token"],
  challenge: "If every bot shares one key, any bot can do anything. A bot that only answers questions could still send email, which is more than it needs.",
  promise: "A tool call runs only when the token is real and not expired. The token must list the scope the tool needs. Least privilege means a bot never does more than its list.",
  production: "Keep the secret in a vault and rotate it. Issue short tokens from one place. Log the bot name on every call.",
  cases: [
    { title: "NAIVE: one key for every bot", why: "All bots share one key that may do everything. The answer bot was asked to email Dr. Lee, and it did.", question: DOSE_AND_EMAIL, flags: { bot: "answer", naive: "true" }, expect: "overreach" },
    { title: "The answer bot answers", why: "The request needs only the search tool. The answer bot's token lists docs.read, so it runs.", question: DOSE, flags: { bot: "answer" }, expect: "allowed" },
    { title: "The answer bot is asked to email", why: "The search runs. The email does not, because the answer bot's token has no email.send.", question: DOSE_AND_EMAIL, flags: { bot: "answer" }, expect: "partly-denied" },
    { title: "The outreach bot may email", why: "Its token lists email.send, so both tools run. It is the right bot for this job.", question: DOSE_AND_EMAIL, flags: { bot: "outreach" }, expect: "allowed" },
    { title: "The report bot reads the CRM", why: "Its token lists crm.read. It counts the doctors and nothing more.", question: "How many doctors are in our CRM?", flags: { bot: "report" }, expect: "allowed" },
    { title: "The answer bot is asked about the CRM", why: "The answer bot has no crm.read. Doctor records stay closed to it.", question: "How many doctors are in our CRM?", flags: { bot: "answer" }, expect: "denied" },
    { title: "EDGE: a token with a changed scope", why: "Someone edits the answer bot's token to add email.send. The signature no longer matches, so every call is refused.", question: DOSE, flags: { bot: "answer", forge: "true" }, expect: "denied" },
    { title: "EDGE: an old token", why: "The token lasted five minutes and that time has passed. A stolen token stops working on its own.", question: DOSE, flags: { bot: "answer", expired: "true" }, expect: "denied" },
  ],
  play(question, flags) {
    const bot = flags.bot || "answer";
    const now = 1000;
    print(field("Question", question));
    if (flags.naive) print(field("Bot", `${bot}, using the shared key, scopes: every scope`));
    else print(field("Bot", `${bot}, scopes: ${BOT_SCOPES[bot].join(", ")}`));
    let token = tokenFor(bot, now);
    if (flags.naive) token = issue({ bot: "shared", scopes: ["docs.read", "crm.read", "email.send"], expires: now + 300 }, botSecret());
    if (flags.forge) token = forged(token, now);
    const later = flags.expired ? now + 600 : now;
    const sent: string[] = [];
    const decisions = runBot(question, token, modelFrom(flags), sent, later);
    rule("LOG, STEP BY STEP");
    for (const one of decisions) show(one);
    console.log();
    return judge(decisions, sent, flags.naive === "true");
  },
};

// Change the scopes inside a token and keep the old signature, as a thief would.
function forged(token: string, now: number): string {
  const body = Buffer.from(JSON.stringify({ bot: "answer", scopes: ["docs.read", "email.send"], expires: now + 300 }));
  return `${body.toString("base64url")}.${token.split(".")[1]}`;
}

function show(one: Decision): void {
  if (one.allowed) console.log(`${badgeGreen("RAN   ")} ${dim(`${one.reason} It returned: ${one.result}`)}`);
  else console.log(`${badgeRed("DENIED")} ${dim(one.reason)}`);
}

function judge(decisions: Decision[], sent: string[], naive: boolean): string {
  let denied = 0;
  for (const one of decisions) if (!one.allowed) denied += 1;
  print(field("Emails sent", String(sent.length)));
  if (naive && sent.length > 0) {
    box(badgeRed("OVERREACH"), [red("The answer bot sent an email. Nothing stopped it.")], red);
    return "overreach";
  }
  if (denied === 0) box(badgeGreen("ALLOWED"), [green("Every tool call was inside the bot's list.")], green);
  else if (denied < decisions.length) box(badgeYellow("PARTLY DENIED"), [yellow("One call ran. The other was outside the list.")], yellow);
  else box(badgeRed("DENIED"), [red("No call ran.")], red);
  if (denied === 0) return "allowed";
  return denied < decisions.length ? "partly-denied" : "denied";
}
