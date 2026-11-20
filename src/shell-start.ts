// Starts the checked command for the shell tool lab. The lesson is in labs/06-shell-tool.ts.
import type { ShellResult } from "../labs/06-shell-tool";

// We pass the words as a list. No shell reads them, so nothing can be added to the command.
export function startIt(words: string[], copy: string, limit: number): ShellResult {
  const env = { PATH: process.env.PATH || "" };
  const run = Bun.spawnSync(words, { cwd: copy, timeout: limit * 1000, env });
  if (run.exitedDueToTimeout) {
    return { status: "timeout", output: "", why: `stopped after ${limit} seconds` };
  }
  const errors = run.stderr.toString().trim();
  if (run.exitCode !== 0) return { status: "failed", output: errors.slice(0, 300), why: "" };
  const text = run.stdout.toString().trim();
  return { status: "ran", output: text.slice(0, 300), why: "" };
}
