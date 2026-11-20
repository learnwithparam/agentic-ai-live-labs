// What you see on screen for the model routing lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/23-model-routing.ts.

import { modelFrom, type Flags, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { answerAlwaysBig, answerRouted } from "../labs/23-model-routing";

export const lab: Lab = {
  file: "23-model-routing.ts",
  title: "Which model answers",
  about:
    "Each example has a small and a strong model. The small one sorts 500 emails. Then it drafts a reply, and our code checks it. Small first, then strong, is a cascade. Set --small and --big to ok, nocite or invent, and pick the email with --mail.",
  terms: ["route", "cascade", "check"],
  challenge: "The strong model costs ten times more. Using it for all 500 emails wastes money. Using the small one alone can put a wrong total in a contract reply.",
  promise: "The small model goes first, and a reply that fails the check is never sent. A small model that fails twice moves the job up. If the strong model fails too, nothing is sent.",
  production: "Route the sorting to the small model, and check each draft in code. After two failed small tries, route the job to the strong model. Log which tier answered.",
  cases: [
    { title: "NAIVE: always the strong model", why: "All 500 emails and the Acme reply go to the strong model, and nobody checks the reply. It works, but it costs ten times more than it needs to.", question: "Sort the week's 500 emails and reply to Acme", flags: { mail: "mail-contract", naive: "true" }, expect: "always-big" },
    { title: "The small model is good enough", why: "Sam asks to move a call. The small reply is polite, signed and has no amounts to check. It is sent as it is.", question: "Reply to Sam about moving the call to Thursday", flags: { mail: "mail-meeting" }, expect: "small" },
    { title: "The small model forgets the total", why: "The Acme reply leaves out the 18000 total. The check names the problem, the small model tries again, and the second try passes.", question: "Reply to the signed Acme contract", flags: { mail: "mail-contract", small: "nocite" }, expect: "small-retry" },
    { title: "EDGE: the small model invents a total", why: "It writes 19000 each time. The check catches it in code, twice. Like a junior who fails twice, the job moves up to the strong model.", question: "Confirm the Acme total in the reply", flags: { mail: "mail-contract", small: "invent" }, expect: "big" },
    { title: "EDGE: every model fails", why: "Neither the small nor the strong model passes the check. We send nothing, and Maya looks at it.", question: "Draft the contract thank-you for Maya", flags: { mail: "mail-contract", small: "invent", big: "invent" }, expect: "refused" },
  ],
  play(question, flags) {
    print(field("Task", question));
    const small = modelFrom(pick(flags, flags.small));
    const big = modelFrom(pick(flags, flags.big));
    const mail = String(flags.mail || "mail-contract");
    let result;
    if (flags.naive) result = answerAlwaysBig(mail, big);
    else result = answerRouted(mail, small, big);
    rule("LOG, STEP BY STEP");
    for (const line of result.log) console.log(dim(line));
    console.log();
    print(field("Reply", result.answer));
    print(field("Cost", `${result.cost} millicents (strong model alone: ${result.bigOnly})`));
    if (result.tier === "small") box(badgeGreen("SMALL MODEL"), [green("Checked and sent on the first try.")], green);
    else if (result.tier === "small-retry") box(badgeGreen("SMALL, SECOND TRY"), [green("The check named the problem, and the retry passed.")], green);
    else if (result.tier === "big") box(badgeYellow("STRONG MODEL"), [yellow("Two small tries failed the check.")], yellow);
    else if (result.tier === "refused") box(badgeRed("NOT SENT"), [red("Every reply failed the check.")], red);
    else box(badgeRed("NO CHECK"), [red("The strong model did everything, and nothing checked it.")], red);
    return result.tier;
  },
};

// The pretend habit for one tier. With --live the flag is passed on and the habit is ignored.
function pick(flags: Flags, habit: string | undefined): Flags {
  if (habit) return { ...flags, model: habit };
  return flags;
}
