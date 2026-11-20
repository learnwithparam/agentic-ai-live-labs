// Three ways to build one job
//
// A new issue lands on the Juniper Studio GitHub. Three jobs follow. Label it. Reproduce it. Fix it.
// A workflow is plain code with fixed steps. One agent is a model that picks its own tools.
// Many agents give each model one job, and a person decides when they doubt.
// Each shape trades control for flexibility. Pick the simplest shape that does the job.
// The examples and the screen output are in show/04-shapes.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab shapes --question "Please label the new issue." --shape agent --task label --issue issue-102 --naive
//   bun run lab shapes --question "Please label the new issue." --shape workflow --issue issue-103
//   bun run lab shapes --question "Can you reproduce the checkout error?" --shape agent --task reproduce --issue issue-103
//   bun run lab shapes --question "Please fix the checkout error." --shape multi --issue issue-103 --model invent --approve n
//   bun run lab shapes --demo

import type { CallLlm } from "../src/model";
import { runLab, type Ask } from "../src/runner";
import { ISSUE_BUILD, ISSUE_LABELS, findIssue, labelByRules } from "../src/studio-bots";
import { CI_LOGS } from "../src/team";
import { countTokens } from "./10-context-budget";

export type Turn = { who: string; text: string };
export type Triage = { answer: string; trace: Turn[]; tokens: number };

// Shape 1, a workflow. Fixed steps in plain code. Same input, same label. No model.
export function labelWorkflow(issueId: string): Triage {
  // Step 1: read the issue. It may not exist.
  const issue = findIssue(issueId);
  if (!issue) return { answer: "unknown", trace: [], tokens: 0 };

  // Step 2: the rules pick the label. This costs no tokens.
  const label = labelByRules(issueId);
  return { answer: label, trace: [{ who: "code", text: `${issue.title} -> ${label}` }], tokens: 0 };
}

// The three tools for shape 2. Each one takes the issue id and gives back text.
function readIssue(issueId: string): string {
  const issue = findIssue(issueId);
  if (!issue) return "No such issue.";
  return `${issue.title}. ${issue.body}`;
}

function readLabels(issueId: string): string {
  return `Labels in use: ${ISSUE_LABELS.join(", ")}`;
}

function readCiLog(issueId: string): string {
  return CI_LOGS[ISSUE_BUILD[issueId]] || "No CI log.";
}

function useTool(name: string, issueId: string): string {
  if (name === "read_issue") return readIssue(issueId);
  if (name === "read_labels") return readLabels(issueId);
  if (name === "read_ci_log") return readCiLog(issueId);
  return "No such tool.";
}

// Shape 2, one agent. The model picks a tool each round. Every round sends the whole chat again.
export function runTriageAgent(task: string, issueId: string, callLlm: CallLlm): Triage {
  const trace: Turn[] = [];
  const results: string[] = [];
  const done: string[] = [];
  let tokens = 0;

  for (let round = 1; round <= 6; round++) {
    // Step 1: build the chat so far and pay for it.
    const head = `TRIAGE: Task: ${task}\nIssue: ${issueId}\nDone: ${done.join(", ")}`;
    const chat = `${head}\n${results.join("\n")}`;
    tokens += countTokens(chat);

    // Step 2: ask the model. A reply that is not a tool request is the answer.
    const reply = (callLlm([{ role: "user", content: chat }], []).text || "").trim();
    if (!reply.startsWith("TOOL ")) {
      trace.push({ who: "agent", text: reply });
      return { answer: reply, trace, tokens };
    }

    // Step 3: run the tool the model asked for.
    const name = reply.slice(5);
    const output = useTool(name, issueId);
    trace.push({ who: name, text: output });
    results.push(`${name}: ${output}`);
    done.push(name);
  }
  return { answer: "STOPPED: too many rounds", trace, tokens };
}

// Shape 3, many agents. A fixer writes the fix, an auditor checks it, and a person decides on doubt.
export type Fixed = { reply: string; trace: Turn[]; passed: boolean; tokens: number };

export function fixAndReview(issueId: string, callLlm: CallLlm, ask: Ask): Fixed {
  const trace: Turn[] = [];

  // Step 1: the first agent reproduces the bug, so the fixer has a failing test to aim at.
  const found = runTriageAgent("reproduce", issueId, callLlm);
  trace.push({ who: "reproducer", text: found.answer });

  // Step 2: the fixer writes a short fix note from what the log showed.
  const noteAsk = `FIXNOTE: ${found.answer}`;
  const note = (callLlm([{ role: "user", content: noteAsk }], []).text || "").trim();
  trace.push({ who: "fixer", text: note });

  // Step 3: the auditor checks the note against the real CI log.
  const log = readCiLog(issueId);
  const check = `CHECKFIX: NOTE: ${note}\nLOG: ${log}`;
  const verdict = (callLlm([{ role: "user", content: check }], []).text || "FAIL").trim();
  trace.push({ who: "auditor", text: verdict });
  const tokens = found.tokens + countTokens(note) + countTokens(verdict);
  const passed = verdict.startsWith("PASS");

  // Step 4: a pass means the fix goes to review. A doubt goes to a person.
  if (passed) return { reply: note, trace, passed, tokens };
  const answer = ask(`The auditor doubts this fix: ${verdict} Merge it anyway? (y/n): `);
  const yes = answer !== null && answer.trim().toLowerCase() === "y";
  if (yes) return { reply: note, trace, passed, tokens };
  return { reply: "REJECTED_BY_REVIEW", trace, passed, tokens };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/04-shapes");
  runLab(lab);
}
