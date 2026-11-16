// Where run records live: one small JSON file per run, in a folder anyone can read.
// We write to a temp file first, then rename it. A reader never sees half a file.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import type { Run } from "../labs/19-run-state";

export function runsDir(): string {
  return process.env.RUNS_DIR || ".runs";
}

export function saveRun(run: Run): void {
  mkdirSync(runsDir(), { recursive: true });
  const file = `${runsDir()}/${run.id}.json`;
  writeFileSync(`${file}.tmp`, JSON.stringify(run, null, 2));
  renameSync(`${file}.tmp`, file);
}

// Read a run record back, the way another process would. null means there is no such run.
export function loadRun(id: string): Run | null {
  try {
    return JSON.parse(readFileSync(`${runsDir()}/${id}.json`, "utf8"));
  } catch {
    return null;
  }
}
