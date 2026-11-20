// Crash and resume
//
// Sales Outbound is Juniper Studio's bot. It sends a follow-up to 40 leads that went quiet.
// At lead 17 the program is killed. Maybe the machine restarted. Maybe memory ran out.
// If we start over, the first 17 leads get the same email twice. They think the studio is broken.
// If we give up, 23 leads get nothing.
// So the bot keeps a ledger of finished steps, and every email has a key.
// A restart leaves out what is in the ledger. The outbox refuses a key it has already sent.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/21-crash-and-resume.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario naive
//   bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario clean
//   bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario resume
//   bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario between
//   bun run lab crash-and-resume --question "Send a follow-up to the 40 quiet leads" --scenario done
//   bun run lab crash-and-resume --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { LEAD_IDS, companyOf } from "../src/team";
import { dieIf, isDone, markDone, sendAlways, sendOnce } from "../src/jobs"; // the files and the kill

export type Job = { sent: string[]; skipped: string[]; drafted: number; log: string[] };
export { LEAD_IDS };

// Follow up with every lead, and survive a kill. Read the steps in order.
export function runJob(jobId: string, leads: string[], callLlm: CallLlm, dieAt = ""): Job {
  const job: Job = { sent: [], skipped: [], drafted: 0, log: [] };
  for (const lead of leads) {
    const key = `${jobId}:${lead}`;

    // Step 1: the ledger lists every step that finished. Do not redo those.
    if (isDone(jobId, key)) {
      job.skipped.push(lead);
      job.log.push(`Step 1: ${lead} is in the ledger, so it is skipped.`);
      continue;
    }

    // Step 2: the model writes the email.
    const mail = { key, to: lead, body: draftEmail(lead, callLlm) };
    job.drafted += 1;

    // Step 3: send it with its key. The outbox refuses a key it already holds.
    const fresh = sendOnce(jobId, mail);
    if (fresh) {
      job.sent.push(lead);
      job.log.push(`Step 3: ${lead}: sent.`);
    } else {
      job.log.push(`Step 3: ${lead}: the key was used before, so no second email.`);
    }
    dieIf(dieAt, `send:${lead}`);

    // Step 4: write the ledger line only after the send. A kill before this line is safe.
    markDone(jobId, key);
    job.log.push(`Step 4: ${lead} is in the ledger.`);
    dieIf(dieAt, `ledger:${lead}`);
  }
  return job;
}

// Ask the model for one short follow-up email.
export function draftEmail(lead: string, callLlm: CallLlm): string {
  const company = companyOf(lead);
  const prompt = `FOLLOWUP: Write a two line follow-up to ${company}. Offer a 20 minute call.`;
  return (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
}

// The naive way: no ledger and no key. A restart begins again, and every email goes out again.
export function runJobNaive(jobId: string, leads: string[], callLlm: CallLlm, dieAt = ""): Job {
  const job: Job = { sent: [], skipped: [], drafted: 0, log: [] };
  for (const lead of leads) {
    const mail = { key: `${jobId}:${lead}`, to: lead, body: draftEmail(lead, callLlm) };
    job.drafted += 1;
    sendAlways(jobId, mail);
    job.sent.push(lead);
    job.log.push(`${lead}: sent.`);
    dieIf(dieAt, `send:${lead}`);
  }
  return job;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/21-crash-and-resume");
  runLab(lab);
}
