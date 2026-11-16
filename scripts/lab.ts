// bun run lab            lists the labs
// bun run lab 3          runs lab 3 (add --demo, --question "..." and so on after it)
import { readdirSync } from "node:fs";

const files = readdirSync("labs")
  .filter((name) => /^\d\d-.*\.ts$/.test(name))
  .sort();

const wanted = process.argv[2];
const file = files.find((name) => Number(name.slice(0, 2)) === Number(wanted));

if (!wanted || !file) {
  console.log("Labs:");
  for (const name of files) console.log(`  bun run lab ${Number(name.slice(0, 2))}   ${name}`);
  process.exit(wanted ? 1 : 0);
}

const run = Bun.spawnSync(["bun", `labs/${file}`, ...process.argv.slice(3)], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(run.exitCode);
