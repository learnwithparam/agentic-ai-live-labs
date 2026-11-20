// What you see on screen for the chains and delegation lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/30-chain-and-delegate.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { fileNaive, fileReceipts, type Filing } from "../labs/30-chain-and-delegate";

const APRIL = "receipt-fontshop,receipt-lunch,receipt-cloud";

// The right answer for each receipt. The lunch is in euros, so only a person can match it.
const TRUTH: Record<string, string> = {
  "receipt-fontshop": "bank-1 software",
  "receipt-lunch": "none",
  "receipt-cloud": "bank-3 hosting",
};

export const lab: Lab = {
  file: "30-chain-and-delegate.ts",
  title: "Chains and delegation",
  about:
    "Each example files receipts for Juniper Studio. The lead hands each receipt to a worker, and each step in the chain feeds the next one. Pick receipts with --receipts. Add --open true for a lead that plans its own workers.",
  terms: ["chain", "delegate", "lead", "worker"],
  challenge: "One long prompt matches, labels and files at once. It grabs the first bank line, so the books fill with wrong entries that look right.",
  promise: "Each receipt is matched to a real bank line and given a label the books use. One that does not match is held for a person. The other receipts still go. A lead that plans its own workers is capped at three.",
  production: "Run the same chain for every receipt, and hand each to its own worker. Never guess a match. Send what does not fit to Maya, with the reason. Cap how many workers an open ended lead may start.",
  cases: [
    { title: "NAIVE: one long prompt", why: "One prompt must match, label and file all the April receipts. It grabs the first bank line each time. Two entries are wrong, and the euro lunch is filed anyway.", question: "File all the April receipts", flags: { naive: "true" }, expect: "wrong-filing" },
    { title: "Three receipts, three chains", why: "The font licence and the cloud bill match and are filed. The Acme lunch is in euros. The bank line is in dollars. So it goes to a person.", question: "Match the April receipts to the bank and file them", expect: "partial" },
    { title: "One receipt", why: "One worker matches the font licence to bank-1 and files it as software.", question: "File the font licence from the email", flags: { receipts: "receipt-fontshop" }, expect: "all-filed" },
    { title: "EDGE: nothing matches", why: "The Acme lunch has no bank line in euros. The worker will not guess. It hands the receipt to Maya.", question: "Where did the Acme client lunch go in the bank?", flags: { receipts: "receipt-lunch" }, expect: "to-a-person" },
    { title: "EDGE: a label the books do not use", why: "The model calls the font licence gadgets. The books have no such label, so the worker holds it.", question: "Label the font licence for the books", flags: { receipts: "receipt-fontshop", model: "invent" }, expect: "to-a-person" },
    { title: "An open ended lead", why: "This lead plans its own workers. It asks for match, categorize and file, which is three. That fits the cap.", question: "Plan the filing for the cloud bill", flags: { receipts: "receipt-cloud", open: "true" }, expect: "all-filed" },
    { title: "EDGE: a plan with too many workers", why: "The lead plans six workers and repeats the same ones. The cap is three, so the code refuses the plan.", question: "Plan the filing for the cloud bill, with checks", flags: { receipts: "receipt-cloud", open: "true", model: "wanders" }, expect: "capped" },
  ],
  play(question, flags) {
    const ids = (flags.receipts || APRIL).split(",");
    print(field("Job", question));
    const model = modelFrom(flags);
    let filings: Filing[];
    if (flags.naive) filings = fileNaive(ids, model);
    else filings = fileReceipts(ids, model, Boolean(flags.open));
    rule("LOG, STEP BY STEP");
    for (const filing of filings) for (const line of filing.log) console.log(dim(line));
    console.log();
    return judge(filings);
  },
};

function judge(filings: Filing[]): string {
  let wrong = 0;
  let held = 0;
  let capped = 0;
  for (const filing of filings) {
    const got = filing.filed ? `${filing.bank} ${filing.category}` : "none";
    if (got !== TRUTH[filing.receipt]) wrong += 1;
    if (!filing.filed) held += 1;
    if (!filing.filed && filing.log[0].includes("cap")) capped += 1;
    print(field(filing.receipt, filing.filed ? got : "held for a person"));
  }
  if (wrong > 0 && held === 0) {
    box(badgeRed("WRONG FILING"), [red(`${wrong} entries do not match the truth.`)], red);
    return "wrong-filing";
  }
  if (capped > 0) {
    box(badgeYellow("CAPPED"), [yellow("The plan asked for more than three workers.")], yellow);
    return "capped";
  }
  if (held === filings.length) {
    box(badgeYellow("TO A PERSON"), [yellow("Nothing was filed. Maya decides.")], yellow);
    return "to-a-person";
  }
  if (held > 0) {
    box(badgeGreen("PARTIAL"), [green(`${held} held for a person. The rest are filed and right.`)], green);
    return "partial";
  }
  box(badgeGreen("ALL FILED"), [green("Every receipt is matched and labelled.")], green);
  return "all-filed";
}
