// Lab 38: Check every sentence of a draft
//
// A team member writes an email for Dr. Lee. One sentence says Cardioza is safe for children.
// The email cites an approved document, so it looks fine. But the document never says that.
// Asking the model "is it fine?" does not help. It has no new facts, so it says yes.
// So code cuts the draft into sentences and checks each one against the approved documents.
// A sentence about a drug must cite a document. The document must fit the country.
// The sentence must be word for word in that document. One bad sentence blocks the email.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/38-fact-checker.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/38-fact-checker.ts --question "Please check this email draft for Dr. Lee before it goes out." --draft "Hello Dr. Lee. Cardioza is safe for children under 12. [DOC-101] Please call us with questions." --naive
//   bun labs/38-fact-checker.ts --question "Please check this email draft for Dr. Lee before it goes out." --draft "Hello Dr. Lee. Cardioza is safe for children under 12. [DOC-101] Please call us with questions."
//   bun labs/38-fact-checker.ts --question "Please check this email draft for Dr. Lee before it goes out." --draft "Hello Dr. Lee. Cardioza standard adult dose is 10mg once daily with food. [DOC-101] Please call us with questions."
//   bun labs/38-fact-checker.ts --question "Please check this email draft for Dr. Weber before it goes out." --draft "Hello Dr. Weber. Cardioza standard adult dose is 10mg once daily with food. [DOC-101]" --country DE
//   bun labs/38-fact-checker.ts --question "Please check this email draft for Dr. Lee before it goes out." --draft "Hello Dr. Lee. Cardioza standard adult dose is 10mg once daily with food. [DOC-101] Cardioza also works for headaches. [DOC-101]"
//   bun labs/38-fact-checker.ts --demo

import { APPROVED_DOCS, KNOWN_DRUGS } from "../src/data";
import { citedId, splitSentences, withoutCitation } from "../src/claims";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";

export type Row = { sentence: string; ok: boolean; why: string };
export type Checked = { sent: boolean; rows: Row[] };

// Check a draft one sentence at a time. Read the steps in order.
export function checkClaims(draft: string, country: string): Checked {
  // Step 1: cut the draft into sentences. Every one is checked.
  const rows: Row[] = [];
  for (const sentence of splitSentences(draft)) rows.push(checkSentence(sentence, country));
  // Step 6: the draft goes out only when every sentence passed.
  let sent = true;
  for (const row of rows) if (!row.ok) sent = false;
  return { sent, rows };
}

function checkSentence(sentence: string, country: string): Row {
  // Step 2: a sentence that makes no claim about a drug is plain talk. It passes.
  if (!makesClaim(sentence)) return { sentence, ok: true, why: "plain talk" };
  // Step 3: a claim must cite a document.
  const id = citedId(sentence);
  if (id === "") return fail(sentence, "no citation");
  // Step 4: the document must be real, and approved for this country.
  const doc = APPROVED_DOCS[id];
  if (!doc) return fail(sentence, `${id} is not an approved document`);
  if (doc.country !== country) return fail(sentence, `${id} is not approved for ${country}`);
  // Step 5: the claim must be word for word in that document.
  const claim = withoutCitation(sentence);
  if (!doc.text.includes(claim)) return fail(sentence, `it does not match ${id}`);
  return { sentence, ok: true, why: `matches ${id}` };
}

function fail(sentence: string, why: string): Row {
  return { sentence, ok: false, why };
}

// A sentence makes a claim when it names a drug or holds a number.
function makesClaim(sentence: string): boolean {
  for (const drug of KNOWN_DRUGS) if (sentence.includes(drug)) return true;
  for (const letter of sentence) if ("0123456789".includes(letter)) return true;
  return false;
}

// The naive way: ask the model if the draft is fine. It has no new facts, so the draft goes out.
export function reviewByModel(draft: string, callLlm: CallLlm): Checked {
  const prompt = `REVIEW: ${draft} Is this draft correct?`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  return { sent: true, rows: [{ sentence: reply.text || "", ok: true, why: "the model said so" }] };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/38-fact-checker");
  runLab(lab);
}
