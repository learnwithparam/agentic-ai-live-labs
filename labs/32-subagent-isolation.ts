// Keep noisy work apart
//
// The Bug Triage bot has forty CI build logs to read. Most are quiet. Three of them fail.
// If the main agent reads all forty, its working space fills with junk.
// So the main agent hands the logs to a helper. The helper has its own space.
// The helper sends back a short report. The junk stays with the helper.
// The main agent checks each line of the report against the real logs before it trusts it.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/32-subagent-isolation.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab subagent-isolation --question "Triage this week's CI logs." --naive
//   bun run lab subagent-isolation --question "Which builds failed this week, and why?"
//   bun run lab subagent-isolation --question "Did anything time out overnight?"
//   bun run lab subagent-isolation --question "Which of the 40 builds failed today?" --model invent
//   bun run lab subagent-isolation --question "Which of the 40 builds failed today?" --model stuck
//   bun run lab subagent-isolation --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { allLogs } from "../src/juniper";

export const REPORT_LIMIT = 400;
export type Answered = { answer: string; mainChars: number; helperChars: number; log: string[] };
type Work = { text: string; stopped: boolean; chars: number };
const NO_ANSWER = "I found no checked answer for this.";

// The main agent. Read the steps in order.
export function answerWithHelper(question: string, callLlm: CallLlm, logs = allLogs()): Answered {
  // Step 1: the main agent starts its own space. It holds only the question.
  const main: string[] = [question];
  // Step 2: the helper reads every log in its own space.
  const work = helperRead(logs, callLlm);
  // Step 3: only a short report comes back. A long report is cut. A failed helper says so.
  let report = "HELPER_FAILED: no answer.";
  if (!work.stopped) report = work.text.slice(0, REPORT_LIMIT);
  main.push(report);
  // Step 4: the main agent checks every line of the report against the real logs, then answers.
  let answer = report;
  if (reportProblems(report, logs).length > 0) answer = NO_ANSWER;
  const log = [`Step 2: the helper read ${work.chars} characters.`];
  log.push(`Step 3: the main agent kept ${report.length} characters.`);
  return { answer, mainChars: question.length + report.length, helperChars: work.chars, log };
}

// The naive way: the main agent reads every log itself, so all of it lands in its own space.
export function answerAlone(question: string, callLlm: CallLlm, logs = allLogs()): Answered {
  const work = helperRead(logs, callLlm);
  const log = [`The main agent read ${work.chars} characters itself.`];
  return { answer: work.text, mainChars: question.length + work.chars, helperChars: 0, log };
}

function helperRead(logs: Record<string, string>, callLlm: CallLlm): Work {
  let prompt = "TRIAGE:";
  let chars = 0;
  for (const id in logs) {
    prompt += `\n[${id}]\n${logs[id]}`;
    chars += logs[id].length;
  }
  const reply = callLlm([{ role: "user", content: prompt }], []);
  if (reply.text === undefined) return { text: "", stopped: true, chars };
  return { text: reply.text, stopped: false, chars };
}

// Every report line must name a real log, and that log must hold a failure.
export function reportProblems(report: string, logs: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const line of report.split("\n")) {
    const id = line.split(":")[0];
    if (logs[id] === undefined) problems.push(`${id} is not a real log.`);
    else if (!logs[id].includes("FAIL")) problems.push(`${id} has no failure.`);
  }
  return problems;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/32-subagent-isolation");
  runLab(lab);
}
