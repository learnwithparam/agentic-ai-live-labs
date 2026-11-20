// What you see on screen for the agent loop: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/01-agent-loop.ts.

import { modelFrom, type Lab } from "../src/runner";
import { box, dim, field, green, highlight, print, red, rule, verdict, yellow } from "../src/ui";
import { runAgentLoop, searchOnly } from "../labs/01-agent-loop";

export const lab: Lab = {
  file: "01-agent-loop.ts",
  title: "The agent loop",
  about:
    "Each example is one question about a drug. The model asks for a tool, our code runs it, and the model reads the result. Each trip round the loop is one step. The only source of facts is the approved document search.",
  terms: ["loop", "tool", "step"],
  challenge: "A model's memory can be wrong or old. It needs a tool that looks up the approved facts.",
  production:
    "A step is one trip round the loop. A turn is one reply to the doctor. One turn can hold many steps. Real loops stop on four things: too many steps, too much time, too much money, or the same call twice. Start the caps high. After a week of traces, shrink them to fit.",
  cases: [
    { title: "A normal question", why: "The happy path. One search, then an answer that cites its source.", question: "What is the dose of Cardioza?", expect: "answered" },
    { title: "Same question, different country", why: "Approved text differs by country. Germany gets 5mg and the US gets 10mg. The tool filters by country, so the model cannot override it.", question: "What is the dose of Cardioza?", flags: { country: "DE" }, expect: "answered" },
    { title: "Capital letters", why: "Search ignores case, so shouting the drug name still works.", question: "Can you tell me the CARDIOZA dose please?", expect: "answered" },
    { title: "Two drugs in one question", why: "One search can return two documents. The answer must cite both.", question: "What is the dose of Cardioza and Neurovex?", expect: "answered" },
    { title: "A drug we have no document for", why: "The search finds nothing, so the model must refuse. It must not guess from memory.", question: "Is Zorbex safe for children?", expect: "no-source" },
    { title: "Approved in another country only", why: "Dermalin is approved in the US only. A German doctor gets no answer. That is the right behaviour.", question: "What is the dose of Dermalin?", flags: { country: "DE" }, expect: "no-source" },
    { title: "A spelling mistake", why: "Search needs the exact drug name. A typo finds nothing. A real system would match close spellings or ask the doctor to confirm.", question: "What is the dose of Cardiozza?", expect: "no-source" },
    { title: "Not a drug question at all", why: "Small talk has no approved source. The loop still ends safely.", question: "Hi there, how are you doing today?", expect: "no-source" },
    { title: "The loop hits its step limit", why: "We allow only 1 step. The model gets one tool call and no turn left to answer. A step limit stops a model that never finishes.", question: "What is the dose of Cardioza?", flags: { steps: "1" }, expect: "stopped" },
    { title: "The same call twice stops the loop", why: "A model that asks for the same search again gets the same result. The loop sees the repeat and stops. It does not wait for the step limit.", question: "What is the dose of Cardioza?", flags: { model: "stuck" }, expect: "stopped" },
  ],
  play(question, flags) {
    const country = flags.country || "US";
    const maxSteps = Number(flags.steps || 5);
    const result = runAgentLoop(question, country, modelFrom(flags), searchOnly, maxSteps);
    print(field("Question", question));
    rule("LOG, STEP BY STEP");
    for (const line of result.log) console.log(dim(line));
    console.log();
    if (result.stopped) {
      box("STOPPED", [verdict.blocked(result.why === "same call twice" ? "The same call came twice." : "Step limit reached before the model answered.")], red);
      return "stopped";
    }
    if (/\[[A-Z]+-[A-Z]+\]/.test(result.answer)) {
      box("ANSWER", field("", highlight(result.answer), green, 0), green);
      return "answered";
    }
    box("NO APPROVED SOURCE", field("", highlight(result.answer), yellow, 0), yellow);
    return "no-source";
  },
};
