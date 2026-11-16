// bun run mutate
//
// A test that never fails proves nothing. This breaks one rule in each lab on purpose,
// runs that lab's promise test, and requires the test to FAIL. Then it puts the file back.
// bun run check runs this, so a promise test that cannot catch its own rule cannot ship.
import { readFileSync, writeFileSync } from "node:fs";

type Break = { lab: number; file: string; rule: string; find: string; replace: string };

export const BREAKS: Break[] = [
  { lab: 5, file: "05-tool-schemas.ts", rule: "a rejected call still runs the tool",
    find: 'if (verdict.status === "rejected") return', replace: "if (false) return" },
  { lab: 6, file: "06-shell-tool.ts", rule: "any command may run",
    find: "if (!ALLOWED.includes(words[0]))", replace: "if (false)" },
  { lab: 6, file: "06-shell-tool.ts", rule: "a link may lead out of the folder",
    find: "return real !== home && !real.startsWith(home + sep);", replace: "return false;" },
  { lab: 7, file: "07-mcp-basics.ts", rule: "a tool error looks like an answer",
    find: "if (reply.result.isError) return", replace: "if (false) return" },
  { lab: 8, file: "08-mcp-trust.ts", rule: "a changed tool is still loaded",
    find: "else if (pinned !== fingerprint(tool))", replace: "else if (false)" },
  { lab: 8, file: "08-mcp-trust.ts", rule: "an unknown server is still read",
    find: "if (!APPROVED_SERVERS.includes(manifest.server))", replace: "if (false)" },
  { lab: 9, file: "09-three-doors.ts", rule: "an answer with no document id counts as cited",
    find: 'if (answer.includes("DOC-")) return "answered";\n  return "uncited";', replace: 'return "answered";' },
  { lab: 10, file: "10-context-budget.ts", rule: "a part that does not fit is sent anyway",
    find: "if (used + cost > budget) continue;", replace: "if (false) continue;" },
  { lab: 11, file: "11-history-trimming.ts", rule: "a pinned fact is cut with the old chatter",
    find: "if (turn.fact || index >= firstRecent)", replace: "if (index >= firstRecent)" },
  { lab: 12, file: "12-retrieval.ts", rule: "a chunk from another country is searched",
    find: "if (chunk.country !== country) continue;", replace: "if (false) continue;" },
  { lab: 12, file: "12-retrieval.ts", rule: "a weak match is sent",
    find: "if (score >= MINIMUM_SCORE) hits.push", replace: "if (score >= 1) hits.push" },
  { lab: 13, file: "13-pick-context.ts", rule: "every source is loaded for every question",
    find: "if (reply.includes(source.name))", replace: "if (true)" },
  { lab: 14, file: "14-instructions-vs-data.ts", rule: "an order line reaches the prompt",
    find: "if (hasOrder(line)) {", replace: "if (false) {" },
  { lab: 14, file: "14-instructions-vs-data.ts", rule: "data can close its own fence",
    find: 'line.replaceAll("</data>", "[/data]")', replace: "line" },
  { lab: 15, file: "15-stop-conditions.ts", rule: "a stuck model may repeat forever",
    find: "if (countOf(seen, key) >= limits.maxRepeats)", replace: "if (false)" },
  { lab: 15, file: "15-stop-conditions.ts", rule: "a run may spend past its budget",
    find: "if (spent > limits.budget)", replace: "if (false)" },
  { lab: 16, file: "16-error-feedback.ts", rule: "an error says nothing the model can use",
    find: "Use US or DE.", replace: "That is wrong." },
  { lab: 16, file: "16-error-feedback.ts", rule: "an unfixable call is not sent to a person",
    find: "if (guess === undefined) {", replace: "if (false) {" },
  { lab: 17, file: "17-plan-then-act.ts", rule: "a risky step runs without a person",
    find: "if (checked.risky.length > 0 && !approved)", replace: "if (false)" },
  { lab: 17, file: "17-plan-then-act.ts", rule: "a tool we never gave is allowed",
    find: "if (!ALLOWED_TOOLS.includes(step.tool))", replace: "if (false)" },
  { lab: 17, file: "17-plan-then-act.ts", rule: "a failed step does not stop the rest",
    find: "if (reply === NO_DOC) return stopWith", replace: "if (false) return stopWith" },
  { lab: 18, file: "../src/draft-check.ts", rule: "a wrong dose passes the check",
    find: "if (!dosesIn(source).includes(dose))", replace: "if (false)" },
  { lab: 18, file: "../src/draft-check.ts", rule: "a draft without a citation passes",
    find: 'if (!text.includes("DOC-"))', replace: "if (false)" },
  { lab: 18, file: "18-reflect-and-fix.ts", rule: "fix rounds have no limit",
    find: "round <= MOST_ROUNDS", replace: "round <= 99" },
];

function testPasses(lab: number): boolean {
  const name = String(lab).padStart(2, "0");
  const run = Bun.spawnSync(["bun", "test", `tests/promises/${name}.test.ts`], { stdout: "ignore", stderr: "ignore" });
  return run.exitCode === 0;
}

if (import.meta.main) {
  let missed = 0;
  for (const item of BREAKS) {
    const path = `labs/${item.file}`;
    const original = readFileSync(path, "utf8");
    if (!original.includes(item.find)) {
      console.error(`Lab ${item.lab}: cannot find the rule to break: ${item.find}`);
      process.exit(1);
    }
    writeFileSync(path, original.replace(item.find, item.replace));
    let survived = false;
    try {
      survived = testPasses(item.lab);
    } finally {
      writeFileSync(path, original);
    }
    if (survived) missed += 1;
    console.log(`${survived ? "MISSED" : "caught"}  lab ${item.lab}: ${item.rule}`);
  }
  if (missed > 0) {
    console.error(`${missed} broken rules were not caught by a promise test.`);
    process.exit(1);
  }
  console.log("Every promise test fails when its rule is broken.");
}
