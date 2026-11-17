// What you see on screen for lab 23: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/23-model-routing.ts.

import { modelFrom, type Flags, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { answerAlwaysBig, answerRouted } from "../labs/23-model-routing";

const DOSE = "What is the dose of Cardioza?";

export const lab: Lab = {
  file: "23-model-routing.ts",
  title: "Lab 23: which model answers",
  about:
    "Each example has a small model and a strong model. Our code checks the small model's answer. Pretend habits: --small and --big can be ok, nocite (no citation) or invent (a wrong dose). With --live both tiers use the real model, so the check is real too.",
  terms: "route = pick which model answers. cascade = try the cheap one first, then a better one. check = a rule in our code that an answer must pass.",
  challenge: "The strong model costs ten times more. Using it for every question wastes money. Using the small one alone sends wrong doses to doctors.",
  promise: "The small model answers first. An answer that fails our check is never sent. The strong model is asked only after a failed check. If both fail, nothing is sent.",
  production: "Log which tier answered each question. Watch how often the small model fails the check, and move the line when it changes.",
  cases: [
    { title: "NAIVE: always the strong model", why: "Every question goes to the strong model, and nobody checks the answer. It works, but it costs ten times more than it needs to.", question: DOSE, flags: { naive: "true" }, expect: "always-big" },
    { title: "The small model is good enough", why: "The small answer cites its source and the dose matches. It is sent as it is, and the strong model is never called.", question: DOSE, expect: "small" },
    { title: "The small model forgets the citation", why: "The check fails: no citation. We ask the strong model, and its answer passes.", question: DOSE, flags: { small: "nocite" }, expect: "big" },
    { title: "EDGE: the small model invents a dose", why: "It says 20mg. The document says 10mg. The check catches it in code, and the strong model answers.", question: DOSE, flags: { small: "invent" }, expect: "big" },
    { title: "EDGE: both models fail", why: "Neither answer passes the check. We send nothing, and a person looks at it.", question: DOSE, flags: { small: "nocite", big: "nocite" }, expect: "refused" },
    { title: "EDGE: no approved document", why: "There is no source for Zorbex. The small model says so, and no dose is made up. That is a good answer.", question: "What is the dose of Zorbex?", expect: "small" },
  ],
  play(question, flags) {
    print(field("Question", question));
    const small = modelFrom(pick(flags, flags.small));
    const big = modelFrom(pick(flags, flags.big));
    let result;
    if (flags.naive) result = answerAlwaysBig(question, "US", big);
    else result = answerRouted(question, "US", small, big);
    rule("LOG, STEP BY STEP");
    for (const line of result.log) console.log(dim(line));
    console.log();
    print(field("Answer", result.answer));
    print(field("Cost", `${result.cost} millicents (strong model alone: ${result.bigOnly})`));
    if (result.tier === "small") box(badgeGreen("SMALL MODEL"), [green("Checked and sent. The strong model was not used.")], green);
    else if (result.tier === "big") box(badgeYellow("STRONG MODEL"), [yellow("The small answer failed the check.")], yellow);
    else if (result.tier === "refused") box(badgeRed("NOT SENT"), [red("Both answers failed the check.")], red);
    else box(badgeRed("NO CHECK"), [red("The strong model answered, and nothing checked it.")], red);
    return result.tier;
  },
};

// The pretend habit for one tier. With --live the flag is passed on and the habit is ignored.
function pick(flags: Flags, habit: string | undefined): Flags {
  if (habit) return { ...flags, model: habit };
  return flags;
}
