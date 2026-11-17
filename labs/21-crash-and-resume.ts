// Lab 21: Crash and resume
//
// The agent must email three doctors about Cardioza. After the second email, the program is killed.
// Maybe the machine restarted. Maybe memory ran out. Now what? If we start over, Dr. Lee and
// Dr. Weber get the same email twice. If we give up, Dr. Rao gets nothing.
// So the agent keeps a ledger of finished steps, and every email has a key.
// A restart leaves out what is in the ledger. The outbox refuses a key it has already sent.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/21-crash-and-resume.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/21-crash-and-resume.ts --question "Email the Cardioza update to three doctors" --scenario naive
//   bun labs/21-crash-and-resume.ts --question "Email the Cardioza update to three doctors" --scenario clean
//   bun labs/21-crash-and-resume.ts --question "Email the Cardioza update to three doctors" --scenario resume
//   bun labs/21-crash-and-resume.ts --question "Email the Cardioza update to three doctors" --scenario between
//   bun labs/21-crash-and-resume.ts --question "Email the Cardioza update to three doctors" --scenario done
//   bun labs/21-crash-and-resume.ts --demo

import { APPROVED_DOCS, CRM } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { dieIf, isDone, markDone, sendAlways, sendOnce } from "../src/jobs"; // the files and the kill

export type Job = { sent: string[]; skipped: string[]; drafted: number; log: string[] };
export const DOCTORS = ["H-1", "H-2", "H-3"];

// Email every doctor, and survive a kill. Read the steps in order.
export function runJob(jobId: string, doctors: string[], callLlm: CallLlm, dieAt = ""): Job {
  const job: Job = { sent: [], skipped: [], drafted: 0, log: [] };
  for (const doctor of doctors) {
    const key = `${jobId}:${doctor}`;

    // Step 1: the ledger lists every step that finished. Do not redo those.
    if (isDone(jobId, key)) {
      job.skipped.push(doctor);
      job.log.push(`Step 1: ${doctor} is in the ledger, so it is skipped.`);
      continue;
    }

    // Step 2: the model writes the email.
    const mail = { key, to: doctor, body: draftEmail(doctor, callLlm) };
    job.drafted += 1;

    // Step 3: send it with its key. The outbox refuses a key it already holds.
    const fresh = sendOnce(jobId, mail);
    if (fresh) {
      job.sent.push(doctor);
      job.log.push(`Step 3: ${doctor}: sent.`);
    } else {
      job.log.push(`Step 3: ${doctor}: the key was used before, so no second email.`);
    }
    dieIf(dieAt, `send:${doctor}`);

    // Step 4: write the ledger line only after the send. A kill before this line is safe.
    markDone(jobId, key);
    job.log.push(`Step 4: ${doctor} is in the ledger.`);
    dieIf(dieAt, `ledger:${doctor}`);
  }
  return job;
}

// Ask the model for one short email. The source is the approved document, nothing else.
export function draftEmail(doctor: string, callLlm: CallLlm): string {
  const name = CRM[doctor].name;
  const source = APPROVED_DOCS["DOC-101"].text;
  const prompt = `MAIL: Write one short email to ${name}. Use this source only.\nSOURCE: ${source}`;
  return (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
}

// The naive way: no ledger and no key. A restart begins again, and every email goes out again.
export function runJobNaive(jobId: string, doctors: string[], callLlm: CallLlm, dieAt = ""): Job {
  const job: Job = { sent: [], skipped: [], drafted: 0, log: [] };
  for (const doctor of doctors) {
    const mail = { key: `${jobId}:${doctor}`, to: doctor, body: draftEmail(doctor, callLlm) };
    job.drafted += 1;
    sendAlways(jobId, mail);
    job.sent.push(doctor);
    job.log.push(`${doctor}: sent.`);
    dieIf(dieAt, `send:${doctor}`);
  }
  return job;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/21-crash-and-resume");
  runLab(lab);
}
