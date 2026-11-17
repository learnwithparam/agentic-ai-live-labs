// What you see on screen for the claim checker lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/38-fact-checker.ts.
// A draft comes in with --draft. The check itself is plain code, so the model only reviews in the naive case.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { checkClaims, reviewByModel } from "../labs/38-fact-checker";

const ASK_LEE = "Please check this email draft for Dr. Lee before it goes out.";
const HELLO = "Hello Dr. Lee.";
const DOSE = "Cardioza standard adult dose is 10mg once daily with food. [DOC-101]";
const CALL = "Please call us with questions.";

export const lab: Lab = {
  file: "38-fact-checker.ts",
  title: "Check every sentence of a draft",
  about:
    "Each example is an email draft that a person wrote. Give the draft with --draft, and the doctor's country with --country. Code checks each sentence against the approved documents.",
  terms: "claim = a sentence that says something about a drug. citation = the document id in brackets, such as [DOC-101]. word for word = the same words as the document.",
  challenge: "A draft can cite a real document and still say something that document never says. A model that reviews its own draft has no new facts.",
  promise: "Every sentence is checked. A claim needs a citation, a document for this country, and the document's own words. One bad sentence blocks the email.",
  production: "Use a trained claim finder to catch claims that name no drug. Send each blocked sentence to a medical reviewer, and keep the result in the log.",
  cases: [
    { title: "NAIVE: ask the model if it is fine", why: "The draft says Cardioza is safe for children. The document says nothing like that. The model has no new facts, so it says the draft is fine.", question: ASK_LEE, flags: { draft: `${HELLO} Cardioza is safe for children under 12. [DOC-101] ${CALL}`, naive: "true" }, expect: "self-approved" },
    { title: "Every sentence is checked", why: "The same draft goes to the claim checker. The sentence about children is not in DOC-101, so the email is blocked.", question: ASK_LEE, flags: { draft: `${HELLO} Cardioza is safe for children under 12. [DOC-101] ${CALL}` }, expect: "blocked" },
    { title: "A good draft", why: "The dose sentence is word for word in DOC-101. The other two are plain talk.", question: ASK_LEE, flags: { draft: `${HELLO} ${DOSE} ${CALL}` }, expect: "sent" },
    { title: "EDGE: the wrong country", why: "Dr. Weber is in Germany. DOC-101 is the US label, so its dose is not for him.", question: "Please check this email draft for Dr. Weber before it goes out.", flags: { draft: `Hello Dr. Weber. ${DOSE}`, country: "DE" }, expect: "blocked" },
    { title: "EDGE: only the last sentence is bad", why: "The first sentences are good. The last one is a new claim. It is found, and it is the only one named.", question: ASK_LEE, flags: { draft: `${HELLO} ${DOSE} Cardioza also works for headaches. [DOC-101]` }, expect: "blocked" },
  ],
  play(question, flags) {
    const country = flags.country || "US";
    const draft = flags.draft || "";
    print(field("Request", question));
    print(field("Draft", draft));
    rule("LOG, STEP BY STEP");
    const result = flags.naive ? reviewByModel(draft, modelFrom(flags)) : checkClaims(draft, country);
    for (const row of result.rows) console.log(dim(`${row.ok ? "PASS" : "FAIL"}: ${row.sentence} (${row.why})`));
    console.log();
    if (flags.naive) {
      box(badgeRed("LOOKS GOOD"), [red("The model approved a draft that the documents do not support.")], red);
      return "self-approved";
    }
    if (result.sent) box(badgeGreen("SENT"), [green("Every sentence is supported.")], green);
    else box(badgeRed("BLOCKED"), [red("At least one sentence is not supported.")], red);
    return result.sent ? "sent" : "blocked";
  },
};
