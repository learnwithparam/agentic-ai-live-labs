// One profile for each doctor
//
// The team wants to email Dr. Lee about Dermalin. The email system shows nothing recent.
// But Dr. Lee asked the medical team a question two days ago, and that lives in another system.
// Four systems each hold a piece of the doctor. One piece alone hides the truth.
// So we merge the pieces by NPI, the number that belongs to one doctor. Then we check the rules.
// A doctor who opted out gets nothing. A doctor who was contacted in the last 7 days gets nothing.
// A row with no NPI is never guessed. If its name fits, a person looks first.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/36-hcp-360.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab hcp-360 --question "Please email Dr. Lee the new Dermalin label." --npi 1000000004 --naive
//   bun run lab hcp-360 --question "Please email Dr. Weber the new Cardioza label." --npi 1000000002
//   bun run lab hcp-360 --question "Please email Dr. Lee the new Cardioza label." --npi 1000000001
//   bun run lab hcp-360 --question "Please email Dr. Lee the new Dermalin label." --npi 1000000004
//   bun run lab hcp-360 --question "Please email Dr. Rao the new Neurovex label." --npi 1000000003
//   bun run lab hcp-360 --question "Please email Dr. Okafor the new Dermalin label." --npi 1000000005
//   bun run lab hcp-360 --demo

import { KNOWN_DRUGS } from "../src/data";
import { findProblems } from "../src/draft-check";
import { ALL_ROWS, CRM_ROWS, MAIL_ROWS, type Person, type Row } from "../src/hcp360";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { searchApprovedDocs } from "./01-agent-loop";

export type Profile = { person: Person; contacts: Row[]; unmatched: Row[] };
export type Verdict = { verdict: string; why: string; letter: string; profile: Profile };
export const QUIET_DAYS = 7;

// Decide if we may email a doctor. Read the steps in order.
export function planOutreach(question: string, npi: string, callLlm: CallLlm): Verdict {
  // Step 1: merge the four systems into one profile. The NPI is the only key.
  const profile = mergeByNpi(npi);
  const person = profile.person;
  // Step 2: a doctor who opted out is never contacted.
  if (person.optedOut) return stop("blocked", "the doctor opted out", profile);
  // Step 3: any contact in the last 7 days, in any system, means wait.
  for (const row of profile.contacts) {
    if (row.daysAgo < QUIET_DAYS) {
      return stop("blocked", `${row.system}: ${row.what}, ${row.daysAgo} days ago`, profile);
    }
  }
  // Step 4: a row with no NPI and the same name might be this doctor. A person must look first.
  if (profile.unmatched.length > 0) return stop("held", "a row has no NPI", profile);
  // Step 5: the model writes the email. It is checked against the approved document.
  const letter = writeLetter(question, person, callLlm);
  return { verdict: "sent", why: "no rule blocks it", letter, profile };
}

// Put every row that has this NPI in one profile. Rows with no NPI are only set aside.
export function mergeByNpi(npi: string): Profile {
  let person = CRM_ROWS[0];
  for (const row of CRM_ROWS) if (row.npi === npi) person = row;
  const contacts: Row[] = [];
  const unmatched: Row[] = [];
  for (const row of ALL_ROWS) {
    if (row.npi === npi) contacts.push(row);
    if (row.npi === "" && row.name === person.name) unmatched.push(row);
  }
  return { person, contacts, unmatched };
}

function stop(verdict: string, why: string, profile: Profile): Verdict {
  return { verdict, why, letter: "", profile };
}

function writeLetter(question: string, person: Person, callLlm: CallLlm): string {
  let source = "";
  const country = person.country;
  for (const drug of KNOWN_DRUGS) {
    if (question.includes(drug)) source = searchApprovedDocs(drug, country);
  }
  const task = `MAIL: Write one short email to ${person.name}. Use this source only.`;
  const prompt = `${task}\nSOURCE: ${source}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  const letter = (reply.text || "").trim();
  if (findProblems(letter, source).length > 0) return "";
  return letter;
}

// The naive way: look at the email system only, and send. The other systems are never read.
export function planNaive(question: string, npi: string, callLlm: CallLlm): Verdict {
  const profile = mergeByNpi(npi);
  for (const row of MAIL_ROWS) {
    const recent = row.daysAgo < QUIET_DAYS;
    if (row.npi === npi && recent) return stop("blocked", "recent mail", profile);
  }
  const letter = writeLetter(question, profile.person, callLlm);
  return { verdict: "sent", why: "no recent email", letter, profile };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/36-hcp-360");
  runLab(lab);
}
