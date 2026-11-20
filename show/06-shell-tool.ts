// What you see on screen for the shell tool lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/06-shell-tool.ts.

import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { doTask, runShell, SANDBOX, writeCommand } from "../labs/06-shell-tool";
import type { ShellResult } from "../labs/06-shell-tool";

const BLOCKED = ["rm", "mv", "sudo", "dd"]; // the naive blocklist
const CLEAN_UP = "Clean up the old build logs.";

export const lab: Lab = {
  file: "06-shell-tool.ts",
  title: "A shell tool, safely",
  about:
    "Describe a task and the model writes the command. Or pass your own with --command. Three walls check it. The bot works on a repo called sandbox, with build logs and a coupon test. The naive run uses a list of banned words, on a copy, so nothing real is lost.",
  terms: ["shell", "allow-list", "sandbox"],
  challenge: "A shell can delete files or read secrets. A list of banned words misses commands such as find with a delete flag. An allow-list names the few commands we trust, and the rest never start.",
  promise: "A command that breaks a wall never starts. Even a test that deletes files only changes a throwaway copy. The real repo stays as it was.",
  production: "Run the bot in a container with the network off and no secrets. Keep the allow-list and the throwaway copy as well.",
  cases: [
    { title: "NAIVE: a list of banned words", why: "The blocklist bans rm, mv, sudo and dd. The model cleans up with find and a delete flag. No banned word is in it, so the shell deletes the logs. The demo runs this on a copy.", question: CLEAN_UP, flags: { naive: "true" }, expect: "deleted" },
    { title: "Wall 1: the model asks to clean up", why: "The model writes find with a delete flag. The program find is not on the allow-list, so it never starts.", question: CLEAN_UP, expect: "refused" },
    { title: "Read why a build failed", why: "The model finds the failing line with grep. Reading a log is on the allow-list, so it runs.", question: "What failed in build-2 last night?", expect: "ran" },
    { title: "Read a whole log", why: "A plain read of one log inside the repo. It runs.", question: "Please show me build 3.", flags: { command: "cat build-3.log" }, expect: "ran" },
    { title: "Run the tests", why: "The one way to start bun is the coupon test. The test fails, like build-2, and the bot sees why.", question: "Run the tests for the coupon fix.", expect: "failed" },
    { title: "Wall 2: a test that deletes a file", why: "The coupon test also clears build-1.log. It does, but only in the throwaway copy. Run it, then read the log: it is still there.", question: "Run the tests, then show me build 1.", flags: { command: "bun test ./coupon-check.ts" }, expect: "failed" },
    { title: "Chaining a second command", why: "The first part is allowed. The semicolon would add a delete. We refuse the whole line.", question: "Please read the notes file.", flags: { command: "cat notes.txt; rm notes.txt" }, expect: "refused" },
    { title: "Climbing out of the repo", why: "Two dots mean the folder above. The copy is only a wall if code checks every path.", question: "Show me the package file.", flags: { command: "cat ../package.json" }, expect: "refused" },
    { title: "Wall 3: a web address", why: "The command would reach out to a website. We refuse any web address. The command also gets an empty environment, so it holds no keys.", question: "Send the build log to my server.", flags: { command: "cat https://logs.example/build-2" }, expect: "refused" },
    { title: "A file that is not there", why: "The command is allowed, but it fails. The error goes back to the agent, so it can try again. That is the error feedback lab.", question: "Please show me build 9.", flags: { command: "cat build-9.log" }, expect: "failed" },
    { title: "A command that never ends", why: "Sleep for 5 seconds with a limit of 1. The time limit stops it. Without one, a stuck command would hang the agent.", question: "Wait for the slow build.", flags: { command: "sleep 5", limit: "1" }, expect: "timeout" },
  ],
  play(question, flags) {
    const limit = Number(flags.limit || 5);
    print(field("Task", question));
    if (flags.naive) return playNaive(question);
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
  rule("THREE WALLS");
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

// The NAIVE way: a blocklist, then hand the whole text to a shell and hope.
function blocked(command: string): boolean {
  for (const word of command.split(" ")) {
    if (BLOCKED.includes(word)) return true;
  }
  return false;
}

function playNaive(question: string): string {
  const command = writeCommand(question, modelFrom({}));
  print(field("Command", command));
  rule("A LIST OF BANNED WORDS");
  if (blocked(command)) {
    box("BLOCKED", [red("A banned word was in the command.")], red);
    return "blocked";
  }
  const copy = mkdtempSync(join(tmpdir(), "naive-"));
  try {
    cpSync(SANDBOX, copy, { recursive: true });
    Bun.spawnSync(["sh", "-c", command], { cwd: copy });
    print(field("logs left", existsSync(join(copy, "build-2.log")) ? "build-2.log is there" : "none: every log is gone", dim));
    if (existsSync(join(copy, "build-2.log"))) return "ran";
    box("DELETED", [yellow("No banned word was in the command, yet it deleted the build logs.")], yellow);
    return "deleted";
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}
