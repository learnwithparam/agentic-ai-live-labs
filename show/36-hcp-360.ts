// What you see on screen for the HCP profiles lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/36-hcp-360.ts.
// All the doctors here are invented. The rows are in src/hcp360.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { planNaive, planOutreach } from "../labs/36-hcp-360";

const LEE = "Please email Dr. Lee the new Dermalin label.";

export const lab: Lab = {
  file: "36-hcp-360.ts",
  title: "One profile for each doctor",
  about:
    "Each example asks to email one doctor. Pick the doctor with --npi, the NPI that belongs to that doctor. The bot merges four systems, then decides if the email may go.",
  terms: ["npi", "merge", "opt-out", "quiet-days"],
  challenge: "Each system sees only its own piece. The email system shows nothing recent, so the doctor gets a second message after a medical question.",
  promise: "One profile joins all four systems by NPI. An opt-out blocks the email. So does a contact inside the quiet days, which is 7 days here. A row with no NPI is never guessed.",
  production: "Keep the profile in your CRM. Clean the NPI at the door, and let a person review each held row.",
  cases: [
    { title: "NAIVE: read the email system only", why: "Dr. Lee asked the medical team a question two days ago. The email system shows nothing, so the naive bot sends.", question: LEE, flags: { npi: "1000000004", naive: "true" }, expect: "spam" },
    { title: "Contact from another system", why: "The same request, with all four systems merged. The question two days ago blocks the email.", question: LEE, flags: { npi: "1000000004" }, expect: "blocked" },
    { title: "Nothing recent", why: "Dr. Weber was last contacted 12 days ago. The email is written from the approved German label.", question: "Please email Dr. Weber the new Cardioza label.", flags: { npi: "1000000002" }, expect: "sent" },
    { title: "A recent email", why: "Dr. Lee got a Cardioza email 3 days ago. We wait.", question: "Please email Dr. Lee the new Cardioza label.", flags: { npi: "1000000001" }, expect: "blocked" },
    { title: "EDGE: the doctor opted out", why: "Dr. Rao said no emails. This rule beats every other.", question: "Please email Dr. Rao the new Neurovex label.", flags: { npi: "1000000003" }, expect: "blocked" },
    { title: "EDGE: a row with no NPI", why: "A booth visit has a name but no NPI. It may be Dr. Okafor. A person must look, so the email is held.", question: "Please email Dr. Okafor the new Dermalin label.", flags: { npi: "1000000005" }, expect: "held" },
  ],
  play(question, flags) {
    const llm = modelFrom(flags);
    print(field("Request", question));
    rule("LOG, STEP BY STEP");
    const result = flags.naive ? planNaive(question, flags.npi, llm) : planOutreach(question, flags.npi, llm);
    const profile = result.profile;
    console.log(dim(`Step 1: ${profile.person.name} has ${profile.contacts.length} contact(s) across the systems.`));
    for (const row of profile.contacts) console.log(dim(`  ${row.system}: ${row.what}, ${row.daysAgo} days ago`));
    console.log(dim(`Verdict: ${result.verdict}. ${result.why}.`));
    console.log();
    if (result.letter) print(field("Email", result.letter));
    return judge(result.verdict, flags.naive);
  },
};

function judge(verdict: string, naive: string): string {
  if (naive && verdict === "sent") {
    box(badgeRed("TOO SOON"), [red("The bot sent without seeing the other systems.")], red);
    return "spam";
  }
  if (verdict === "sent") box(badgeGreen("SENT"), [green("No rule blocks this email.")], green);
  else box(badgeGreen(verdict.toUpperCase()), [green("The bot did not send.")], green);
  return verdict;
}
