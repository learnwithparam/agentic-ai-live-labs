// A shell tool, safely
//
// Dr. Lee asks: "Show me the doses file." A shell lets an agent do almost anything. That is the risk.
// The model writes a command. We do not run it at once. Four rules decide if it may start:
// an allow-list, no chaining symbols or flags, one folder, and a time limit.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/06-shell-tool.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab shell-tool --question "Can you show me what is in the doses file?" --command "ls .." --naive
//   bun run lab shell-tool --question "Show me the doses file"
//   bun run lab shell-tool --question "Please delete the notes file for me." --model invent
//   bun run lab shell-tool --question "Can you show me what is in the doses file?" --command "cat doses.txt"
//   bun run lab shell-tool --question "Can you show me what is in the doses file?" --command "rm notes.txt"
//   bun run lab shell-tool --demo

import { existsSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";

export const SANDBOX = "sandbox"; // the only folder the agent may touch
export const ALLOWED = ["ls", "cat", "wc", "head", "sleep"]; // sleep stands in for a slow program
const CHAIN_SYMBOLS = [";", "|", "&", ">", "<", "$", "`", "\n"];

export type ShellResult = { status: string; output: string; why: string };

export type Ran = { command: string; result: ShellResult; log: string[] };

// Turn a task into a command, then let the four rules decide. Read the steps in order.
export function doTask(task: string, callLlm: CallLlm, limit = 2): Ran {
  // Step 1: the model writes one command for the task.
  const command = writeCommand(task, callLlm);
  const log = [`Step 1: the model wrote the command: ${command}`];

  // Step 2: the four rules look at the command. Nothing has started yet.
  const result = runShell(command, SANDBOX, limit);
  log.push(`Step 2: the rules say ${result.status}. ${result.why}`);

  // Step 3: say what came out.
  if (result.status === "refused") log.push("Step 3: no process was started.");
  else log.push(`Step 3: the output was: ${result.output}`);
  return { command, result, log };
}

// Ask the model for the command. Keep the first line only, and remove any quote marks around it.
export function writeCommand(task: string, callLlm: CallLlm): string {
  const rule = "Reply with one shell command only. The folder holds doses.txt and notes.txt.";
  const prompt = `SHELL: ${rule}\nTask: ${task}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  const first = (reply.text || "").trim().split("\n")[0];
  return first.replaceAll("`", "").trim();
}

// Check the command with four rules. Only a command that passes all four is started.
export function runShell(command: string, folder = SANDBOX, limit = 2): ShellResult {
  for (const symbol of CHAIN_SYMBOLS) {
    if (command.includes(symbol)) return refuse(`${symbol} could chain a second command`);
  }
  const words = command.trim().split(" ");
  if (!ALLOWED.includes(words[0])) return refuse(`${words[0]} is not on the allow-list`);
  for (const word of words.slice(1)) {
    if (word.startsWith("-")) return refuse(`${word} is a flag, and flags change a command`);
    if (leavesFolder(word, folder)) return refuse(`${word} leaves the folder`);
  }

  // We pass the words as a list. No shell reads them, so nothing can be added to the command.
  const run = Bun.spawnSync(words, { cwd: folder, timeout: limit * 1000 });
  if (run.exitedDueToTimeout) {
    return { status: "timeout", output: "", why: `stopped after ${limit} seconds` };
  }
  const errors = run.stderr.toString().trim();
  if (run.exitCode !== 0) return { status: "failed", output: errors, why: "" };
  const text = run.stdout.toString().trim();
  return { status: "ran", output: text.slice(0, 300), why: "" };
}

function refuse(why: string): ShellResult {
  return { status: "refused", output: "", why };
}

// A word leaves the folder if it starts at the top of the disk or at home. It also leaves if it climbs up with "..".
// It also leaves if the real file is somewhere else, which a link inside the folder can cause.
function leavesFolder(word: string, folder: string): boolean {
  if (word.startsWith("/") || word.startsWith("~")) return true;
  if (word.split("/").includes("..")) return true;
  const target = resolve(folder, word);
  if (!existsSync(target)) return false;
  const home = realpathSync(folder);
  const real = realpathSync(target);
  return real !== home && !real.startsWith(home + sep);
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/06-shell-tool");
  runLab(lab);
}
