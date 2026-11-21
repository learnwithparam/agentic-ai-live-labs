// A second reader for the reflect and fix lab. It sees only the draft and the source.
// It never sees the question or the writer's prompt, so it cannot share the writer's mistake.
import type { CallLlm } from "./model";

// Ask the critic. It answers PASS, or FAIL and the claim the source does not back.
export function criticSays(draft: string, source: string, callLlm: CallLlm): string {
  const rule = "Reply PASS if every claim in the draft is in the source. Else reply FAIL and say why.";
  const prompt = `CRITIC: ${rule}\nDRAFT: ${draft}\nSOURCE: ${source}`;
  return (callLlm([{ role: "user", content: prompt }], []).text || "FAIL: no answer").trim();
}

export type Checked = { outcome: string; draft: string; problems: string[]; log: string[] };

// Step 6 of the lab: a FAIL from the critic goes to a person.
export function afterCritic(
  outcome: string,
  draft: string,
  source: string,
  llm: CallLlm,
  log: string[],
): Checked {
  const said = criticSays(draft, source, llm);
  log.push(`Step 6: the critic said: ${said}`);
  if (said.startsWith("PASS")) return { outcome, draft, problems: [], log };
  return { outcome: "needs-person", draft, problems: [said], log };
}
