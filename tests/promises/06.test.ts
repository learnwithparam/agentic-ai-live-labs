import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runShell } from "../../labs/06-shell-tool";

// PROMISE: a command that breaks a rule never starts, so the files stay as they were.
test("refused commands change nothing", () => {
  const folder = mkdtempSync(join(tmpdir(), "lab6-"));
  writeFileSync(join(folder, "keep.txt"), "keep me");
  const bad = [
    "rm keep.txt",
    "cat keep.txt; rm keep.txt",
    "cat keep.txt && rm keep.txt",
    "ls $(rm keep.txt)",
    "cat ../x",
    "cat /etc/hosts",
    "cat ~/x",
    "",
  ];
  for (const command of bad) expect(runShell(command, folder).status).toBe("refused");
  expect(existsSync(join(folder, "keep.txt"))).toBe(true);
  expect(runShell("cat keep.txt", folder).output).toBe("keep me");
  rmSync(folder, { recursive: true });
});

test("a slow command is stopped", () => {
  expect(runShell("sleep 5", "sandbox", 1).status).toBe("timeout");
});

test("a link inside the folder cannot lead out, and flags are refused", () => {
  const folder = mkdtempSync(join(tmpdir(), "lab6-"));
  symlinkSync("/etc", join(folder, "door"));
  expect(runShell("ls door", folder).status).toBe("refused");
  expect(runShell("ls -R", folder).status).toBe("refused");
});

