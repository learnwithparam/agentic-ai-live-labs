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
function liveCommands(file: string, lab: Lab): string[][] {
  const commands: string[][] = [];
  for (const item of lab.cases) {
    const flags = item.flags || {};
    if (flags.model || flags.naive) continue;
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
    // Try each free case until one reaches the real model. A lab with none has nothing to prove.
    let calls = 0;
    let last = "";
    for (const command of liveCommands(file, lab)) {
      const real = run(command);
      calls = real.text.split("live-call").length - 1;
      last = real.text.trim().split("\n").slice(-2).join(" | ").slice(0, 200);
      if (real.ok && calls > 0 && !real.text.includes("error:")) break;
      calls = 0;
    }
    if (calls > 0) line += `  live ok, ${calls} model calls`;
    else {
      line += `  live FAILED, no model call\n    ${last}`;
      failed += 1;
    }
  }
  console.log(line);
}
console.log(failed === 0 ? "\nEvery lab ran." : `\n${failed} problems.`);
process.exit(failed === 0 ? 0 : 1);
