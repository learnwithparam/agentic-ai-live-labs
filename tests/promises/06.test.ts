import { expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runShell, RUN_TESTS, SANDBOX } from "../../labs/06-shell-tool";
import { CI_LOGS } from "../../src/team";

// A repo of our own for each test, so no test touches the real one.
function newRepo(): string {
  const folder = mkdtempSync(join(tmpdir(), "lab6-"));
  cpSync(SANDBOX, folder, { recursive: true });
  writeFileSync(join(folder, "keep.txt"), "keep me");
  return folder;
}

// PROMISE: a command that breaks a wall never starts, so the files stay as they were.
// A command that is allowed can only change a throwaway copy.
test("refused commands change nothing", () => {
  const folder = newRepo();
  const bad = [
    "rm keep.txt",
    'find . -name "*.txt" -delete',
    "cat keep.txt; rm keep.txt",
    "cat keep.txt && rm keep.txt",
    "ls $(rm keep.txt)",
    "cat ../x",
    "cat /etc/hosts",
    "cat ~/x",
    "bun run evil.ts",
    "",
  ];
  for (const command of bad) expect(runShell(command, folder).status).toBe("refused");
  expect(existsSync(join(folder, "keep.txt"))).toBe(true);
  expect(runShell("cat keep.txt", folder).output).toBe("keep me");
  rmSync(folder, { recursive: true });
});

test("a web address is refused", () => {
  const result = runShell("cat https://logs.example/build-2", SANDBOX);
  expect(result.status).toBe("refused");
  expect(result.why).toContain("web address");
});

test("a test that deletes files only changes the throwaway copy", () => {
  const folder = newRepo();
  const result = runShell(RUN_TESTS, folder);
  expect(result.status).toBe("failed");
  expect(existsSync(join(folder, "build-1.log"))).toBe(true);
  rmSync(folder, { recursive: true });
});

test("a slow command is stopped", () => {
  expect(runShell("sleep 5", SANDBOX, 1).status).toBe("timeout");
});

test("a link inside the repo cannot lead out, and flags are refused", () => {
  const folder = newRepo();
  symlinkSync("/etc", join(folder, "door"));
  expect(runShell("ls door", folder).status).toBe("refused");
  expect(runShell("ls -R", folder).status).toBe("refused");
  rmSync(folder, { recursive: true });
});

test("the sandbox logs are the CI logs", () => {
  for (const build in CI_LOGS) {
    expect(readFileSync(join(SANDBOX, `${build}.log`), "utf8").trim()).toBe(CI_LOGS[build]);
  }
});
