// Chains and delegation
//
// The medical team says: "Write the Cardioza update for Dr. Lee, Dr. Weber and Dr. Rao."
// One big job for one bot goes wrong in a quiet way. It searches once, for one country,
// and writes the same letter for everyone. Dr. Weber in Germany gets the US dose.
// So a lead splits the job into one small task per doctor. Each worker runs a short chain:
// search, write, check. The lead collects the letters. A worker that fails is named, never hidden.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/30-chain-and-delegate.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab chain-and-delegate --question "Write the Cardioza update for Dr. Lee, Dr. Weber and Dr. Rao." --naive
//   bun run lab chain-and-delegate --question "Write the Cardioza update for Dr. Lee, Dr. Weber and Dr. Rao."
//   bun run lab chain-and-delegate --question "Write the Cardioza update for Dr. Weber please." --hcps dr-weber
//   bun run lab chain-and-delegate --question "Write the Neurovex update for Dr. Lee, Dr. Weber and Dr. Rao."
//   bun run lab chain-and-delegate --demo

import { CRM, KNOWN_DRUGS, NO_DOC } from "../src/data";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { findProblems } from "../src/draft-check";
import { searchApprovedDocs } from "./01-agent-loop";

export type Letter = { hcp: string; sent: boolean; text: string; log: string[] };

// Split the job and hand each part to a worker. Read the steps in order.
export function updateDoctors(job: string, hcpIds: string[], callLlm: CallLlm): Letter[] {
  // Step 1: the lead reads the job once and finds the drug. Then it splits by doctor.
  const drug = drugIn(job);
  const letters: Letter[] = [];
  for (const hcp of hcpIds) letters.push(worker(drug, hcp, callLlm));
  // Step 5: the lead collects every letter. A worker that failed is listed, with the reason.
  return letters;
}

// One worker. It sees one doctor and one country, and nothing else.
function worker(drug: string, hcp: string, callLlm: CallLlm): Letter {
  const name = CRM[hcp].name;
  // Step 2: search for this doctor's country.
  const found = searchApprovedDocs(drug, CRM[hcp].country);
  if (found === NO_DOC) return held(hcp, `${name}: Step 2: no approved ${drug} document.`);
  const id = found.split("]")[0].slice(1);
  // Step 3: write the letter from that document only.
  const prompt = `MAIL: Write one short email to ${name}. Use this source only.\nSOURCE: ${found}`;
  const text = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
  // Step 4: check the letter. It must cite this document and hold no other dose.
  const problems = findProblems(text, found);
  if (!text.includes(id)) problems.push(`it does not cite ${id}`);
  if (problems.length > 0) return held(hcp, `${name}: Step 4: held. ${problems.join("; ")}.`);
  const log = [`${name}: Steps 2 to 4: wrote from ${id}, and it passed.`];
  return { hcp, sent: true, text, log };
}

function held(hcp: string, why: string): Letter {
  return { hcp, sent: false, text: "", log: [why] };
}

function drugIn(job: string): string {
  for (const drug of KNOWN_DRUGS) if (job.includes(drug)) return drug;
  return "";
}

// The naive way: one search for the first doctor, one letter for everyone, and no check.
export function updateNaive(job: string, hcpIds: string[], callLlm: CallLlm): Letter[] {
  const found = searchApprovedDocs(drugIn(job), CRM[hcpIds[0]].country);
  const prompt = `MAIL: Write one short email to the doctors. Use this source.\nSOURCE: ${found}`;
  const text = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
  const letters: Letter[] = [];
  for (const hcp of hcpIds) {
    letters.push({ hcp, sent: true, text, log: [`${hcp}: the same letter.`] });
  }
  return letters;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/30-chain-and-delegate");
  runLab(lab);
}
