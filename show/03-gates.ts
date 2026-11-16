// What you see on screen for lab 3: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/03-gates.ts.

import { modelFrom, type Lab } from "../src/runner";
import { box, dim, field, green, highlight, print, red, rule, verdict, yellow } from "../src/ui";
import { handleHcpInquiry, handleWithoutGate } from "../labs/03-gates";

export const lab: Lab = {
  file: "03-gates.ts",
  title: "Lab 3: human in the loop gates",
  about:
    "A gate stops the run and hands the full story to a person. Gate 1 fires before the model runs, when there is no approved document. Gate 2 fires after, when the reply fails the output check. Add --approve y or --approve n to answer the gate. With no answer, the gate says no.",
  terms: "gate = a stop in the run where a person must say yes. human in the loop = a person who decides before anything goes out. escalate = send it to a person.",
  challenge: "A model always writes something. With no gate, a reply with no source goes straight to a doctor.",
  promise: "With no approved document, or a reply with no source, nothing goes out until a person says yes. No answer means no.",
  production: "Send the gate to a real queue with a name, a time and a reason. Log who approved what. Keep the default as no.",
  cases: [
    { title: "NAIVE: no gate", why: "The model forgets the citation. With no gate, the uncited reply goes straight to the doctor.", question: "Cardioza dose", flags: { model: "nocite", naive: "true" }, expect: "SENT_UNCHECKED" },
    { title: "No gate needed", why: "Approved document found, reply cited. Nothing to stop, so it is sent.", question: "Cardioza dose", expect: "SENT" },
    { title: "Gate 1, reviewer approves", why: "No approved document, so the model is never called. A person sees the fallback message and approves it.", question: "Zorbex dose", flags: { approve: "y" }, expect: "SENT_AFTER_HUMAN_APPROVAL" },
    { title: "Gate 1, reviewer rejects", why: "Same stop, but the person says no. Nothing is sent.", question: "Zorbex dose", flags: { approve: "n" }, expect: "BLOCKED_BY_REVIEWER" },
    { title: "Gate 2, reviewer approves", why: "The model forgot the citation. The output check stops it and a person reads the draft before it can go.", question: "Cardioza dose", flags: { model: "nocite", approve: "y" }, expect: "SENT_AFTER_HUMAN_APPROVAL" },
    { title: "Gate 2, reviewer rejects", why: "Same stop, and the person rejects it.", question: "Cardioza dose", flags: { model: "nocite", approve: "n" }, expect: "BLOCKED_BY_REVIEWER" },
    { title: "Patient details in the question", why: "The note is masked before the search, so the reply and the reviewer never see the SSN or the name.", question: "Cardioza dose for Patient: Jane Doe, SSN 123-45-6789", expect: "SENT" },
    { title: "Approved in another country only", why: "Dermalin is approved in the US only. A German doctor hits gate 1.", question: "Dermalin dose", flags: { country: "DE", approve: "n" }, expect: "BLOCKED_BY_REVIEWER" },
    { title: "Small talk", why: "No drug, no document. The safe default is to stop and ask a person.", question: "hello there", flags: { approve: "n" }, expect: "BLOCKED_BY_REVIEWER" },
  ],
  play(question, flags, ask) {
    const country = flags.country || "US";
    const callLlm = modelFrom(flags);
    print(field("Question", question));
    const outcome = flags.naive
      ? handleWithoutGate(question, country, callLlm)
      : handleHcpInquiry(question, country, callLlm, ask);
    rule("LOG, STEP BY STEP");
    for (const line of outcome.log) console.log(dim(line));
    console.log();
    if (outcome.status === "SENT_UNCHECKED") box("SENT WITH NO CHECK", [red("An uncited reply reached the doctor.")], red);
    else if (outcome.status === "SENT") box("SENT", field("", highlight(outcome.reply), green, 0), green);
    else if (outcome.status === "SENT_AFTER_HUMAN_APPROVAL") box("SENT AFTER A PERSON APPROVED", field("", highlight(outcome.reply), yellow, 0), yellow);
    else box("BLOCKED BY REVIEWER", [verdict.blocked("Nothing was sent to the doctor.")], red);
    return outcome.status;
  },
};
