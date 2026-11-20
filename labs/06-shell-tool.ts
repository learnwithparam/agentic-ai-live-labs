// A shell tool, safely
//
// The bug triage bot must read CI logs and run the tests. A shell lets an agent do almost anything.
// That is the risk. A list of banned words is not enough: "find . -delete" has no banned word in it.
// So the model writes a command, and three walls decide what happens to it:
// an allow-list of programs, one throwaway copy of the repo, and no web addresses or secrets.
// There is also a time limit. The run prints each step as it happens.
// The examples and the screen output are in show/06-shell-tool.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab shell-tool --question "Clean up the old build logs." --naive
//   bun run lab shell-tool --question "What failed in build-2 last night?"
//   bun run lab shell-tool --question "Run the tests for the coupon fix."
//   bun run lab shell-tool --question "Clean up the old build logs."
//   bun run lab shell-tool --question "Please read the build log." --command "cat build-2.log"
//   bun run lab shell-tool --demo

import { cpSync, existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { startIt } from "../src/shell-start";

export const SANDBOX = "sandbox"; // the repo the bot works on. The bot never touches it.
// sleep stands in for a slow program
export const ALLOWED = ["ls", "cat", "grep", "wc", "head", "sleep", "bun"];
export const RUN_TESTS = "bun test ./coupon-check.ts"; // the one way to start bun
const CHAIN_SYMBOLS = [";", "|", "&", ">", "<", "$", "`", "\n"];

export type ShellResult = { status: string; output: string; why: string };

export type Ran = { command: string; result: ShellResult; log: string[] };

// Turn a task into a command, then let the walls decide. Read the steps in order.
export function doTask(task: string, callLlm: CallLlm, limit = 5): Ran {
  // Step 1: the model writes one command for the task.
  const command = writeCommand(task, callLlm);
  const log = [`Step 1: the model wrote the command: ${command}`];

  // Step 2: the three walls look at the command. Nothing has started yet.
  const result = runShell(command, SANDBOX, limit);
  log.push(`Step 2: the walls say ${result.status}. ${result.why}`);

  // Step 3: say what came out.
  if (result.status === "refused") log.push("Step 3: no process was started.");
  else log.push(`Step 3: the output was: ${result.output}`);
  return { command, result, log };
}

// Ask the model for the command. Keep the first line only, and remove any quote marks around it.
export function writeCommand(task: string, callLlm: CallLlm): string {
  const rule = "Reply with one shell command only. The repo holds build logs and a coupon test.";
  const prompt = `SHELL: ${rule}\nTask: ${task}`;
  const reply = callLlm([{ role: "user", content: prompt }], []);
  const first = (reply.text || "").trim().split("\n")[0];
  return first.trim();
}

// Check the command with three walls. Only a command that passes all three is started.
export function runShell(command: string, repo = SANDBOX, limit = 5): ShellResult {
  // Wall 1: the allow-list. Only named programs, no chaining symbols and no flags.
  const listed = checkAllowList(command);
  if (listed !== "") return refuse(listed);
  const words = command.trim().split(" ");

  // Wall 3: no web addresses. The command also gets an empty environment, so no keys.
  if (command.includes("://")) return refuse("a web address could send data out");

  // Wall 2: work in one throwaway copy of the repo. The real repo is never touched.
  const copy = mkdtempSync(join(tmpdir(), "triage-"));
  try {
    cpSync(repo, copy, { recursive: true });
    for (const word of words.slice(1)) {
      if (leavesFolder(word, copy)) return refuse(`${word} leaves the copy`);
    }
    return startIt(words, copy, limit);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

function checkAllowList(command: string): string {
  for (const symbol of CHAIN_SYMBOLS) {
    if (command.includes(symbol)) return `${symbol} could chain a second command`;
  }
  const words = command.trim().split(" ");
  if (!ALLOWED.includes(words[0])) return `${words[0]} is not on the allow-list`;
  if (words[0] === "bun" && command.trim() !== RUN_TESTS) return `bun may only run: ${RUN_TESTS}`;
  for (const word of words.slice(1)) {
    if (word.startsWith("-")) return `${word} is a flag, and flags change a command`;
  }
  return "";
}

function refuse(why: string): ShellResult {
  return { status: "refused", output: "", why };
}

// A word leaves the folder if it starts at the top of the disk or at home.
// It also leaves if it climbs up with "..", or if a link inside the folder points away.
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
