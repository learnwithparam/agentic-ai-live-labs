// Lab 4: three shapes. Workflow (code decides), one agent (model picks tools), multi-agent (two roles plus a gate).
import { CRM } from "../src/data";
import { askFrom, banner, eachQuestion, flags, modelFrom } from "../src/cli";
import { hcpContextWorkflow, multiAgentPipeline, singleHcpAgent } from "../src/shapes";

const f = flags();
const shape = f.shape ?? "agent";
const hcpId = f.hcp ?? "H-1";
const model = modelFrom(f);
const ask = askFrom(f);

if (!CRM[hcpId]) {
  console.error(`Unknown HCP ${hcpId}. Use one of: ${Object.keys(CRM).join(", ")}`);
  process.exit(1);
}

banner(
  `Lab 4: shape = ${shape}`,
  `HCP ${hcpId} (${CRM[hcpId].name}). Pick a shape with --shape workflow, agent or multi. Pick a doctor with --hcp H-1, H-2 or H-3.\nUse --model invent with --shape multi to see the auditor catch a wrong dose that still has a valid citation.`,
);

eachQuestion(f, "Ask a doctor question (the workflow shape ignores it).", (question) => {
  if (shape === "workflow") {
    console.log(JSON.stringify(hcpContextWorkflow(hcpId), null, 2));
  } else if (shape === "agent") {
    const r = singleHcpAgent(question, hcpId, model);
    for (const s of r.steps) console.log(`  step ${s.step} [${s.kind}] ${s.detail}`);
    console.log(`\nANSWER: ${r.answer}`);
  } else if (shape === "multi") {
    const country = CRM[hcpId].country;
    const r = multiAgentPipeline(question, country, model, ask);
    for (const t of r.trace) console.log(`  ${t}`);
    console.log(`\nFINAL: ${r.reply}`);
  } else {
    console.error("Unknown shape. Use workflow, agent or multi.");
    process.exit(1);
  }
});
