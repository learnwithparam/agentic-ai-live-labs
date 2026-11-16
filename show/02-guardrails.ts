// What you see on screen for lab 2: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/02-guardrails.ts.

import { modelFrom, type Lab } from "../src/runner";
import { box, dim, field, green, highlight, mark, print, red, rule, verdict, yellow } from "../src/ui";
import { bold } from "../src/ui";
import { answerSafely, answerUnguarded } from "../labs/02-guardrails";

export const lab: Lab = {
  file: "02-guardrails.ts",
  title: "Lab 2: guardrails and private details",
  about:
    "Each example is a note from a doctor. The input guardrail hides private details before the model reads the note. The output guardrail blocks any reply with no approved source.",
  terms: "PHI = private health details, like a name or a record number. token = a label such as [SSN] that stands in for a private piece. guardrail = a check in plain code, before or after the model.",
  challenge: "Once a model has read a patient's name or number, you cannot take it back. And a model can write a fact with no source.",
  promise: "The model only ever reads the hidden version of a note. A reply with no approved source is blocked.",
  production: "Rules catch only the formats you wrote. Add a trained detector and a person to review what it misses. Never log the raw note.",
  cases: [
    { title: "NAIVE: no guardrails", why: "The model reads the patient's name and social security number. Its reply goes out with no check. Once a model has read private details, you cannot take them back.", question: "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) on Cardioza dose", flags: { naive: "true" }, expect: "leaked 3" },
    { title: "Name, social security number and phone", why: "The classic case. All three are hidden, and the model only ever sees the tokens.", question: "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) on Cardioza dose", expect: "3 masked, passed" },
    { title: "Email, record number and birth date", why: "Other formats the input guardrail knows about.", question: "Cardioza dose for jane.doe@mail.com, MRN 1234567, DOB: 04/12/1980", expect: "3 masked, passed" },
    { title: "Nothing private", why: "A clean question passes through unchanged. No false alarms.", question: "Cardioza dose", expect: "0 masked, passed" },
    { title: "EDGE: a number format we do not know", why: "The SSN has no dashes, so our rule misses it and it stays in the note. This is the limit of rule-based hiding. Real systems add a trained detector and a review step.", question: "Patient has SSN 123456789 and takes Cardioza, dose?", expect: "0 masked, passed" },
    { title: "EDGE: a name with no label", why: "We only catch names that follow 'Patient:'. A bare name goes straight through.", question: "Jane Doe takes Cardioza, what is the dose?", expect: "0 masked, passed" },
    { title: "Reply with no citation", why: "This model gives the right fact but forgets the source tag. The output guardrail blocks it anyway. An uncited claim never goes out.", question: "Cardioza dose", flags: { model: "nocite" }, expect: "0 masked, blocked" },
    { title: "No approved source, so no citation", why: "The model refuses, and a refusal has no citation either. The guardrail blocks it. In lab 3 that sends it to a person.", question: "Zorbex dose", expect: "0 masked, blocked" },
    { title: "EDGE: wrong dose, valid citation", why: "The model says 20mg and cites the real document. A citation check cannot see that the claim is wrong. Only a check of the claim itself can. That is lab 4.", question: "Cardioza dose", flags: { model: "invent" }, expect: "0 masked, passed" },
  ],
  play(note, flags) {
    const country = flags.country || "US";
    const callLlm = modelFrom(flags);
    const result = flags.naive ? answerUnguarded(note, country, callLlm) : answerSafely(note, country, callLlm);
    const spans = [];
    for (const item of result.found) {
      const start = note.indexOf(item.text);
      spans.push({ start, end: start + item.text.length });
    }
    print(field("Note", mark(note, spans, (text) => bold(red(text))), dim, 8));
    rule("LOG, STEP BY STEP");
    for (const line of result.log) console.log(dim(line));
    console.log();
    if (flags.naive) {
      const words = result.found.length;
      box("LEAKED", [red(`The model read ${words} private pieces. The reply was sent with no check.`)], red);
      return `leaked ${words}`;
    }
    if (result.check.ok) console.log(verdict.safe("Cites an approved source. Safe to send."));
    else console.log(verdict.blocked(result.check.reason));
    if (result.check.ok && flags.model === "invent") {
      box("LOOK CLOSER", [yellow("The guardrail passed, yet the dose is wrong. A citation is not proof.")], yellow);
    }
    return `${result.found.length} masked, ${result.check.ok ? "passed" : "blocked"}`;
  },
};
