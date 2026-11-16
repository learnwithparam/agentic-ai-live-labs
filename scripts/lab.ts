// bun run lab            lists the labs by track
// bun labs/03-gates.ts   runs one lab by its file (add --demo or --question "...")
import { LABS, TRACKS } from "../src/roadmap";
import { isReady, labFile } from "./path";
import { bold, cyan, dim } from "../src/ui";

const wanted = Number(process.argv[2]);
const lab = LABS.find((item) => item.number === wanted);

if (!process.argv[2]) {
  for (const track of TRACKS) {
    console.log(`\n${bold(track.name)} ${dim(track.idea)}`);
    for (const item of LABS.filter((entry) => entry.track === track.id)) {
      const label = `${cyan(String(item.number).padStart(2))}  ${item.title}`;
      console.log(isReady(item) ? `  ${label}` : `  ${dim(`${item.number}  ${item.title}  (coming)`)}`);
    }
  }
  console.log(dim("\nbun run lab <number> runs a lab. bun run path shows the learning paths."));
  process.exit(0);
}
if (!lab) {
  console.error(`No lab ${process.argv[2]}. Run bun run lab to see the list.`);
  process.exit(1);
}
if (!isReady(lab)) {
  console.error(`Lab ${lab.number} (${lab.title}) is coming. It is not written yet.`);
  process.exit(1);
}

const run = Bun.spawnSync(["bun", `labs/${labFile(lab)}`, ...process.argv.slice(3)], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(run.exitCode);
