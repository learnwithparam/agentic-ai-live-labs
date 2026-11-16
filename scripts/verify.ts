// bun run verify         runs every lab on the pretend model, all cases
// bun run verify:live    also runs one case of every lab on a real model
// The live run needs OPENROUTER_API_KEY in the environment. The key is never printed.
import { existsSync, readdirSync } from "node:fs";
import type { Lab } from "../src/runner";

const live = process.argv.includes("--live");
const only = process.argv.find((word) => /^\d\d$/.test(word));

function run(args: string[]) {
  const env = { ...process.env, LIVE_TRACE: "1" };
  const done = Bun.spawnSync(["bun", ...args], { stdout: "pipe", stderr: "pipe", env });
  const text = done.stdout.toString() + done.stderr.toString();
  return { ok: done.exitCode === 0, text };
}

// Every case that does not force a pretend behaviour, so a real model can answer it.
// The naive cases run live too. Only --model (a pretend habit) is left out.
function liveCommands(file: string, lab: Lab): string[][] {
  const commands: string[][] = [];
  for (const item of lab.cases) {
    const flags = item.flags || {};
    if (flags.model) continue;
    const args = ["labs/" + file, "--question", item.question];
    for (const key of Object.keys(flags)) {
      args.push(`--${key}`);
      if (flags[key] !== "true") args.push(flags[key]);
    }
    commands.push([...args, "--live"]);
  }
  return commands;
}

let failed = 0;
for (const file of readdirSync("labs").sort()) {
  if (!/^\d\d-.*\.ts$/.test(file)) continue;
  if (only && !file.startsWith(only)) continue;
  const place = existsSync(`show/${file}`) ? "show" : "labs";
  const { lab } = (await import(`../${place}/${file}`)) as { lab: Lab };

  const demo = run([`labs/${file}`, "--demo"]);
  const matched = demo.ok && demo.text.includes("behaved as expected");
  let line = `${file}  pretend ${matched ? "ok" : "FAILED"}`;
  if (!matched) failed += 1;

  if (live) {
    // Run every case on the real model. A case passes when it exits cleanly with no error line.
    // The real model may word things differently, so we do not compare the outcome word.
    let calls = 0;
    let passed = 0;
    const failures: string[] = [];
    const commands = liveCommands(file, lab);
    for (const command of commands) {
      const real = run(command);
      calls += real.text.split("live-call").length - 1;
      if (real.ok && !real.text.includes("error:")) passed += 1;
      else failures.push(command.slice(1, -1).join(" ") + " => " + real.text.trim().split("\n").slice(-2).join(" | ").slice(0, 160));
    }
    line += `  live ${passed}/${commands.length} cases, ${calls} model calls`;
    if (failures.length > 0 || calls === 0) {
      line += "  FAILED";
      for (const item of failures) line += `\n    ${item}`;
      failed += 1;
    }
  }
  console.log(line);
}
console.log(failed === 0 ? "\nEvery lab ran." : `\n${failed} problems.`);
process.exit(failed === 0 ? 0 : 1);
