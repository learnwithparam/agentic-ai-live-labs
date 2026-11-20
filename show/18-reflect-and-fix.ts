// What you see on screen for the reflect and fix lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/18-reflect-and-fix.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, print, red, rule, yellow } from "../src/ui";
import { answerFromForm, answerWithCheck, answerWithoutCheck } from "../labs/18-reflect-and-fix";

export const lab: Lab = {
  file: "18-reflect-and-fix.ts",
  title: "Check the draft, then fix it",
  about:
    "Each example is a doctor's question. The pretend model writes a draft, and sometimes the draft is wrong. Pick how it acts with --model. Use ok, nocite (no citation), overclaim (an extra claim), invent (a wrong dose) or stubborn. Stubborn is a wrong dose it will not fix.",
  terms: ["draft", "check", "round"],
  challenge: "A model that grades its own work has no new facts. It says the draft looks good, even when the dose is wrong.",
  promise: "Code runs a check on every draft against the source. A fix gets two rounds at most. With no source there is nothing to check.",
  production: "Check what code can check, like numbers and citations. The model fills a small form. Code looks the number up in the newest label. A critic that sees only the draft and the source checks the rest. Send what is left to a person, and keep every round in the log.",
  cases: [
    { title: "NAIVE: ask the model if it is fine", why: "The model writes 20mg. The document says 10mg. We ask the model if the draft is fine. It has no new facts, so it says yes.", question: "How much Cardioza does an adult take each day?", flags: { model: "invent", naive: "true" }, expect: "self-approved" },
    { title: "A good draft", why: "It cites the document and the dose matches. No fix is needed.", question: "What is the dose of Cardioza?", expect: "accepted" },
    { title: "A missing citation", why: "The check finds no citation. The model adds one, and the second check passes.", question: "What is the dose of Cardioza?", flags: { model: "nocite" }, expect: "fixed" },
    { title: "A wrong dose", why: "The check finds 20mg is not in the document. The model changes it to 10mg.", question: "What is the dose of Cardioza?", flags: { model: "invent" }, expect: "fixed" },
    { title: "EDGE: a model that will not change", why: "The model sends the same wrong draft twice. After two rounds we stop and give it to a person.", question: "What is the dose of Cardioza?", flags: { model: "stubborn" }, expect: "gave-up" },
    { title: "A second reader catches what code cannot", why: "The numbers and the citation are right. But the draft adds that the drug is safe for children. The source never says that. The critic sees only the draft and the source, and it fails the draft.", question: "What is the dose of Cardioza?", flags: { model: "overclaim" }, expect: "needs-person" },
    { title: "A form, then code writes the number", why: "The model fills drug and age. It never writes a dose. Code takes the adult dose from the newest label, version 2. Version 1 said 20mg and is ignored.", question: "How much Cardioza should an adult take?", flags: { form: "true" }, expect: "from-label" },
    { title: "EDGE: no age means both doses", why: "The doctor gave no age. The form says unknown, so code prints the adult dose and the child dose.", question: "How much Cardioza should I give?", flags: { form: "true" }, expect: "from-label" },
    { title: "No approved document", why: "Zorbex has no approved document. With nothing to check against, there is no answer to give.", question: "Is Zorbex safe for children?", expect: "no-source" },
  ],
  play(question, flags) {
    const country = flags.country || "US";
    const callLlm = modelFrom(flags);
    print(field("Question", question));
    if (flags.form) {
      const formed = answerFromForm(question, country, callLlm);
      rule("LOG, STEP BY STEP");
      for (const line of formed.log) console.log(dim(line));
      if (formed.outcome === "from-label") box(badgeGreen("FROM LABEL"), [formed.draft], yellow);
      else box(badgeYellow("NO SOURCE"), [yellow("No label, so no number.")], yellow);
      return formed.outcome;
    }
    const result = flags.naive ? answerWithoutCheck(question, country, callLlm) : answerWithCheck(question, country, callLlm);
    rule("LOG, STEP BY STEP");
    for (const line of result.log) console.log(dim(line));
    if (result.outcome === "self-approved" && result.problems.length > 0) {
      box(badgeRed("LOOKS GOOD"), [red(`The model approved a bad draft: ${result.problems.join(", ")}.`)], red);
    } else if (result.outcome === "self-approved") {
      box(badgeYellow("LOOKS GOOD"), [yellow("The draft was fine this time. The model could not have known.")], yellow);
    }
    else if (result.outcome === "gave-up") box(badgeYellow("GAVE UP"), [yellow(`Still wrong: ${result.problems.join(", ")}. A person decides.`)], yellow);
    else if (result.outcome === "needs-person") box(badgeYellow("CRITIC FAILED IT"), [yellow(result.problems[0])], yellow);
    else if (result.outcome === "no-source") box(badgeYellow("NO SOURCE"), [yellow("Nothing to check against, so nothing to say.")], yellow);
    else box(badgeGreen(result.outcome.toUpperCase()), [result.draft], yellow);
    return result.outcome;
  },
};
