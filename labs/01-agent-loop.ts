// Lab 1: the basic agent loop. Watch each step: the model asks for a tool, the tool runs, the model answers.
import { banner, eachQuestion, flags, modelFrom } from "../src/cli";
import { runAgentLoop } from "../src/loop";

const f = flags();
const country = f.country ?? "US";
const model = modelFrom(f);

banner("Lab 1: the agent loop", `Country ${country}. Try: "What is the dose of Cardioza?" or "Is Zorbex safe for children?"`);

eachQuestion(f, "Ask a doctor question.", (question) => {
  const result = runAgentLoop(question, country, model, { maxSteps: Number(f.steps ?? 5) });
  for (const s of result.steps) console.log(`  step ${s.step} [${s.kind}] ${s.detail}`);
  console.log(`\nANSWER: ${result.answer}`);
});
