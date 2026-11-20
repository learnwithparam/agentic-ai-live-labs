// Talent Scout pieces for the run state lab. The applicants and their CVs are invented.
// The bot scores one applicant at a time. Two of them are special, so the lab has something to catch.

import type { Entry, Run } from "../labs/19-run-state";
import type { CallLlm } from "./model";
import { saveRun } from "./runs";
import { APPLICANTS, type Applicant } from "./team";

export const BAD_CV = "applicant-040"; // the CV file is empty, so every try fails
export const FLAKY_CV = "applicant-077"; // the CV service is busy once, then it works

export type Scored = { ok: boolean; score: number; note: string };

// Applicants are numbered from 1. "from 71, count 10" gives applicant-071 to applicant-080.
export function pickApplicants(from: number, count: number): Applicant[] {
  return APPLICANTS.slice(from - 1, from - 1 + count);
}

// Ask the model to score one applicant. A reply that starts with ERROR is a failed try.
export function screenOne(applicant: Applicant, attempt: number, callLlm: CallLlm): Scored {
  const line = `${applicant.id}; years=${applicant.years}; skills=${applicant.skills.join(",")}`;
  const prompt = `SCREEN: Score this applicant from 0 to 100.\nApplicant: ${line}\nAttempt: ${attempt}`;
  const reply = (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
  if (reply.startsWith("ERROR")) return { ok: false, score: 0, note: reply };
  return { ok: true, score: Number(reply.split("=")[1]), note: "scored" };
}

// One line of the record: what happened to one applicant.
export function entryFor(scored: Scored, tries: number): Entry {
  let status = "failed";
  if (scored.ok) status = "done";
  return { status, tries, score: scored.score, note: scored.note };
}

// A new record has an id, a status and no results yet.
export function openRun(task: string, total: number, now = Date.now()): Run {
  const id = "R-" + crypto.randomUUID().slice(0, 6);
  const run: Run = { id, task, status: "running", startedAt: now, updatedAt: now, total, reason: "", results: {} };
  saveRun(run);
  return run;
}

// Close the record. A run that stopped keeps its reason, so nobody has to guess.
export function closeRun(run: Run, status: string, reason: string, now = Date.now()): Run {
  run.status = status;
  run.reason = reason;
  run.updatedAt = now;
  saveRun(run);
  return run;
}

export function isDone(run: Run, id: string): boolean {
  return id in run.results && run.results[id].status === "done";
}

export function countDone(run: Run): number {
  let done = 0;
  for (const id in run.results) if (run.results[id].status === "done") done += 1;
  return done;
}
