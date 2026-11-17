// What you see on screen for the shell tool lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/06-shell-tool.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { doTask, runShell, SANDBOX } from "../labs/06-shell-tool";
import type { ShellResult } from "../labs/06-shell-tool";

const ASK_FILE = "Can you show me what is in the doses file?";

export const lab: Lab = {
  file: "06-shell-tool.ts",
  title: "A shell tool, safely",
  about:
    "Describe a task and the model writes the command. Or pass a command yourself with --command, as if the model wrote it. Four rules decide if it may start. The agent works in one folder called sandbox, which holds two small files.",
  terms: ["shell", "allow-list", "sandbox"],
  challenge: "A shell can delete files or read secrets. An allow-list lets only the commands we name, so an agent cannot do anything it likes.",
  promise: "A command that breaks a rule never starts, so the files stay as they were.",
  production: "Run the agent in a container with no secrets and no network. Keep this allow-list as well.",
  cases: [
    { title: "The model writes the command", why: "The model turns a plain task into a command. The four rules still decide if it starts.", question: "Show me the doses file", expect: "ran" },
    { title: "The model asks to delete", why: "The task asks for a delete. The model writes rm. It is not on the allow-list, so it never starts.", question: "Please delete the notes file for me.", expect: "refused" },
    { title: "NAIVE: hand it to a shell", why: "The model writes ls .. and the shell obeys. It lists the folder ABOVE the sandbox. The same hole would let it read or delete there.", question: ASK_FILE, flags: { command: "ls ..", naive: "true" }, expect: "escaped" },
    { title: "List the folder", why: "A harmless command on the allow-list. It runs.", question: ASK_FILE, flags: { command: "ls"}, expect: "ran" },
    { title: "Read a file", why: "Reading a file inside the sandbox is fine.", question: ASK_FILE, flags: { command: "cat doses.txt"}, expect: "ran" },
    { title: "A command not on the list", why: "rm can delete. It is not on the allow-list, so it is refused before anything starts.", question: ASK_FILE, flags: { command: "rm notes.txt"}, expect: "refused" },
    { title: "Chaining a second command", why: "The first part is allowed. The semicolon would add a delete. We refuse the whole line.", question: ASK_FILE, flags: { command: "cat notes.txt; rm notes.txt"}, expect: "refused" },
    { title: "Climbing out of the folder", why: "Two dots mean the folder above. The sandbox is only a rule if code enforces it.", question: ASK_FILE, flags: { command: "cat ../package.json"}, expect: "refused" },
    { title: "An absolute path", why: "A path from the top of the disk could read any file. It is refused.", question: ASK_FILE, flags: { command: "cat /etc/hosts"}, expect: "refused" },
    { title: "A file that is not there", why: "The command is allowed, but it fails. The error goes back to the agent, so it can try again. That is the error feedback lab.", question: ASK_FILE, flags: { command: "cat missing.txt"}, expect: "failed" },
    { title: "A command that never ends", why: "Sleep for 5 seconds with a limit of 1. The time limit stops it. Without one, a stuck command would hang the agent.", question: ASK_FILE, flags: { command: "sleep 5", limit: "1" }, expect: "timeout" },
  ],
  play(question, flags) {
    const limit = Number(flags.limit || 2);
    print(field("Task", question));
    if (flags.naive) return playNaive(flags.command);
    if (flags.command) return showCommand(flags.command, runShell(flags.command, SANDBOX, limit));
    const ran = doTask(question, modelFrom(flags), limit);
    rule("LOG, STEP BY STEP");
    for (const line of ran.log) console.log(dim(line));
    console.log();
    return showCommand(ran.command, ran.result);
  },
};

function showCommand(command: string, result: ShellResult): string {
  print(field("Command", command));
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
}

// The NAIVE way: hand the whole text to a shell and hope.
function naiveShell(command: string): string {
  const run = Bun.spawnSync(["sh", "-c", command], { cwd: SANDBOX });
  const text = run.stdout.toString() + run.stderr.toString();
  return text.trim();
}

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

