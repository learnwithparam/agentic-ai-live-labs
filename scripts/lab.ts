// bun run lab                 lists the labs by track
// bun run lab agent-loop      runs one lab by its concept name
// bun run lab agent-loop --demo   (or --question "...", naive, live)
// A short word from the name works too, if only one lab matches it: bun run lab mcp
import { LABS, TRACKS, slugFromFile } from "../src/roadmap";
import { isReady, labFile } from "./path";
import { easyWords } from "../src/runner";
import { bold, cyan, dim } from "../src/ui";

// The concept name is the main way in. An exact name always wins over a partial match.
const named = process.argv[2] || "";
const lab =
  LABS.find((item) => item.slug === named) ??
  LABS.find((item) => String(item.number) === named) ??
  LABS.find((item) => named !== "" && item.slug.includes(named));

// Plain words for the common flags: bun run lab agent-loop demo, naive or live.
const extra = easyWords(process.argv.slice(3));

if (!process.argv[2]) {
  const width = Math.max(...LABS.map((item) => item.slug.length));
  for (const track of TRACKS) {
    console.log(`\n${bold(track.name)} ${dim(track.idea)}`);
    for (const item of LABS.filter((entry) => entry.track === track.id)) {
      const name = cyan(item.slug.padEnd(width));
      const label = `${name}  ${item.title}`;
      console.log(isReady(item) ? `  ${label}` : `  ${dim(`${item.slug.padEnd(width)}  ${item.title}  (coming)`)}`);
    }
  }
  console.log(dim("\nbun run lab agent-loop --demo runs one lab. Add naive or live. bun run path shows the learning paths."));
  process.exit(0);
}
if (!lab) {
  console.error(`No lab called "${named}". Run bun run lab to see the list.`);
  process.exit(1);
}
if (!isReady(lab)) {
  console.error(`The lab "${lab.slug}" is coming. It is not written yet.`);
  process.exit(1);
}

const run = Bun.spawnSync(["bun", `labs/${labFile(lab)}`, ...extra], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
process.exit(run.exitCode);
