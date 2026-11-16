// Lab 2: guardrails. Mask personal and patient details first. Check the reply for a citation last.
import { APPROVED_DOCS } from "../src/data";
import { banner, eachQuestion, flags, modelFrom } from "../src/cli";
import { redactPhi, verifyOutput } from "../src/guardrails";
import { runAgentLoop } from "../src/loop";

const f = flags();
const country = f.country ?? "US";
const model = modelFrom(f);

banner(
  "Lab 2: guardrails",
  `Try: "Call from Dr. Lee about Patient: Jane Doe (SSN 123-45-6789, 555-123-4567) on Cardioza"\nUse --model nocite to see the output guardrail block a reply with no citation.`,
);

eachQuestion(f, "Paste a note with personal details.", (raw) => {
  const { clean, found } = redactPhi(raw);
  console.log(`\nINPUT GUARDRAIL`);
  console.log(`  before: ${raw}`);
  console.log(`  after : ${clean}`);
  console.log(`  found : ${found.length ? found.join(", ") : "nothing"}`);

  const { answer } = runAgentLoop(clean, country, model);
  console.log(`\nMODEL DRAFT: ${answer}`);

  const verdict = verifyOutput(answer, new Set(Object.keys(APPROVED_DOCS)));
  console.log(`OUTPUT GUARDRAIL: ${verdict.ok ? "passed, safe to send" : verdict.reason}`);
});
