// LAB 6: A SHELL TOOL, SAFELY
//
// Read PART 1. A shell lets an agent do almost anything. That is the risk.
// Four rules make it safe: an allow-list, no chaining symbols, one folder, and a time limit.
// The PART 2 section only prints the result in colour. You can skip it.
//
// Run it:   bun run lab 6            (a menu of examples)
//           bun run lab 6 --demo     (every edge case, with a reason for each)
//           bun run lab 6 --naive    (the same menu, with no rules at all)

import { runLab, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";

// PART 1: THE CORE LOGIC

export const SANDBOX = "sandbox"; // the only folder the agent may touch
export const ALLOWED = ["ls", "cat", "wc", "head", "sleep"]; // sleep stands in for a slow program
const CHAIN_SYMBOLS = [";", "|", "&", ">", "<", "$", "`", "\n"];

export type ShellResult = { status: string; output: string; why: string };

function refuse(why: string): ShellResult {
  return { status: "refused", output: "", why };
}

// A word leaves the folder if it starts at the top of the disk, at home, or climbs up with "..".
function leavesFolder(word: string): boolean {
  if (word.startsWith("/") || word.startsWith("~")) return true;
  return word.split("/").includes("..");
}

// Check the command with four rules. Only a command that passes all four is started.
export function runShell(command: string, folder = SANDBOX, limit = 2): ShellResult {
  for (const symbol of CHAIN_SYMBOLS) {
    if (command.includes(symbol)) return refuse(`${symbol} could chain a second command`);
  }
  const words = command.trim().split(" ");
  if (!ALLOWED.includes(words[0])) return refuse(`${words[0]} is not on the allow-list`);
  for (const word of words.slice(1)) {
    if (leavesFolder(word)) return refuse(`${word} leaves the folder`);
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

// The NAIVE way: hand the whole text to a shell and hope.
export function naiveShell(command: string): string {
  const run = Bun.spawnSync(["sh", "-c", command], { cwd: SANDBOX });
  const text = run.stdout.toString() + run.stderr.toString();
  return text.trim();
}

// PART 2: HOW IT IS SHOWN (you can skip this)

export const lab: Lab = {
  file: "06-shell-tool.ts",
  title: "Lab 6: a shell tool, safely",
  about:
    "The question box takes the command an agent wants to run. Four rules decide if it starts. The agent works in one folder called sandbox, which holds two small files.",
  terms: "shell = a program that runs commands. allow-list = the only commands we permit. sandbox = a folder it cannot leave.",
  challenge: "A shell can delete files or read secrets. An agent that can type anything can do anything.",
  promise: "A command that breaks a rule never starts, so the files stay as they were.",
  production: "Run the agent in a container with no secrets and no network, and keep this allow-list as well.",
  cases: [
    { title: "NAIVE: hand it to a shell", why: "The agent asks for ls .. and the shell obeys. It lists the folder ABOVE the sandbox. The same hole would let it read or delete there.", question: "ls ..", flags: { naive: "true" }, expect: "escaped" },
    { title: "List the folder", why: "A harmless command on the allow-list. It runs.", question: "ls", expect: "ran" },
    { title: "Read a file", why: "Reading a file inside the sandbox is fine.", question: "cat doses.txt", expect: "ran" },
    { title: "A command not on the list", why: "rm can delete. It is not on the allow-list, so it is refused before anything starts.", question: "rm notes.txt", expect: "refused" },
    { title: "Chaining a second command", why: "The first part is allowed. The semicolon would add a delete. We refuse the whole line.", question: "cat notes.txt; rm notes.txt", expect: "refused" },
    { title: "Climbing out of the folder", why: "Two dots mean the folder above. The sandbox is only a rule if code enforces it.", question: "cat ../package.json", expect: "refused" },
    { title: "An absolute path", why: "A path from the top of the disk could read any file. It is refused.", question: "cat /etc/hosts", expect: "refused" },
    { title: "A file that is not there", why: "The command is allowed, but it fails. The error goes back to the agent, so it can try again. That is lab 16.", question: "cat missing.txt", expect: "failed" },
    { title: "A command that never ends", why: "Sleep for 5 seconds with a limit of 1. The time limit stops it. Without one, a stuck command would hang the agent.", question: "sleep 5", flags: { limit: "1" }, expect: "timeout" },
  ],
  play(command, flags) {
    print(field("Command", command));
    if (flags.naive) return playNaive(command);
    const result = runShell(command, SANDBOX, Number(flags.limit || 2));
    rule("FOUR RULES");
    const badge = {
      ran: badgeGreen("RAN"),
      failed: badgeYellow("FAILED"),
      timeout: badgeYellow("TIMEOUT"),
      refused: badgeRed("REFUSED"),
    };
    console.log(badge[result.status as "ran"]);
    if (result.why) print(field("why", result.why, red));
    if (result.status === "refused") box("NOT STARTED", [red("No process was started.")], red);
    if (result.output) print(field("output", result.output, result.status === "ran" ? green : yellow));
    return result.status;
  },
};

function playNaive(command: string): string {
  rule("NO RULES");
  const output = naiveShell(command);
  print(field("output", output, dim));
  if (output.includes("package.json")) {
    box("ESCAPED", [yellow("It listed the folder above the sandbox, and it could have changed it.")], yellow);
    return "escaped";
  }
  return "ran";
}

if (import.meta.main) runLab(lab);
