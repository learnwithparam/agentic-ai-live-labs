// Account Manager data: Acme Dental's renewal file. All of it is invented.
// Three years of mail, a year of call notes and the contract. One clause matters most.

export const KEY_CLAUSE = "Clause 7: At renewal the price may rise by at most 4 percent.";

const FILLER = "We are happy with the work so far. Please keep every file in the shared folder. " +
  "The team will meet again next week to look at the plan, the money and the dates for the next job.";
const TOPICS = [
  "Sam asked for the logo files.", "Sam sent the new price list.", "Sam wants the poster by May.",
  "Sam asked for a call about the site.", "Sam sent photos of the new office.", "Sam asked for a late fee waiver.",
  "Sam said the invoice came late.", "Sam shared the staff list.", "Sam asked about the video.",
  "Sam sent the board notes.", "Sam wants a new menu page.", "Sam thanked the team.",
];

// One mail a month for three years.
export function renewalMail(): string {
  const lines: string[] = [];
  for (let month = 0; month < 36; month++) {
    const year = 2024 + Math.floor(month / 12);
    const number = String((month % 12) + 1).padStart(2, "0");
    lines.push(`${year}-${number} mail from Sam: ${TOPICS[month % 12]} ${FILLER}`);
  }
  return lines.join("\n");
}

const TALK = "We talked for half an hour about the plan, the budget and who owns each task.";

// 12 call notes, four a year.
export function renewalCalls(): string {
  const lines: string[] = [];
  for (let call = 0; call < 12; call++) {
    const year = 2024 + Math.floor(call / 4);
    lines.push(`${year} call ${(call % 4) + 1}: ${TOPICS[(call * 5) % 12]} Maya promised to follow up. ${TALK}`);
  }
  return lines.join("\n");
}

const CLAUSE_TEXT = "The studio and Acme Dental agree to the terms below, and both sides keep a copy.";

// 14 clauses. Clause 7 sits in the middle, where a long prompt hides it.
export function renewalContract(): string {
  const lines: string[] = [];
  for (let number = 1; number <= 14; number++) {
    if (number === 7) lines.push(KEY_CLAUSE);
    else lines.push(`Clause ${number}: ${CLAUSE_TEXT} Part ${number} covers the work, the dates and the files.`);
  }
  return lines.join("\n");
}

// Which files a question needs. Our code reads them back from disk. The model does not choose.
export function phasesNeeded(question: string): string[] {
  const text = question.toLowerCase();
  const needed: string[] = [];
  const contractWords = ["clause", "price", "contract", "cap"];
  const mailWords = ["invoice", "complain", "mail"];
  const callWords = ["promise", "call"];
  for (const word of callWords) if (text.includes(word) && !needed.includes("calls")) needed.push("calls");
  for (const word of contractWords) if (text.includes(word) && !needed.includes("contract")) needed.push("contract");
  for (const word of mailWords) if (text.includes(word) && !needed.includes("mail")) needed.push("mail");
  return needed;
}
