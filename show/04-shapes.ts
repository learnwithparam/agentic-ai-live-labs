// What you see on screen for the shapes lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/04-shapes.ts.

import { modelFrom, type Ask, type Lab } from "../src/runner";
import { badgeBlue, badgeMagenta, bold, box, cyan, dim, field, green } from "../src/ui";
import { print, red, rule, verdict, yellow } from "../src/ui";
import { ISSUE_LABELS, findIssue } from "../src/studio-bots";
import { fixAndReview, labelWorkflow, runTriageAgent } from "../labs/04-shapes";
import type { Triage, Turn } from "../labs/04-shapes";

const SHAPES: Record<string, string> = {
  workflow: "Plain code decides every step. The model is never called. Cheap, predictable, easy to test.",
  agent: "One model chooses among several tools and decides when it is done. Flexible, less predictable.",
  multi: "A reproducer, a fixer and an auditor. A person decides on any doubt.",
};

export const lab: Lab = {
  file: "04-shapes.ts",
  title: "Three ways to build one job",
  about:
    "Plain code labels a new issue. One agent reproduces it. Many agents fix and check it. Pick the shape with --shape workflow, agent or multi, and the issue with --issue issue-101, issue-102 or issue-103. For an agent, pick the job with --task label or reproduce.",
  terms: ["workflow", "agent", "many-agents", "auditor"],
  challenge: "An agent used for plain labels costs far more than code. It can give a label that is not on the list. Use an agent only where the path must change.",
  promise: "Labels come from code and never vary. An agent pays for every round. An auditor stops a fix that names the wrong test, and a person decides on any doubt.",
  production: "Label with a workflow, because the rules never change. Use one agent where the path changes, such as reproducing a bug. Add an auditor and a person where a bad fix would reach the main branch.",
  cases: [
    { title: "NAIVE: an agent for a plain label", why: "The agent reads the issue, the label list and a CI log it did not need. It pays for every round, to do what three lines of code do.", question: "A new issue came in. Please label it.", flags: { shape: "agent", task: "label", issue: "issue-102", naive: "true" }, expect: "agent-labelled" },
    { title: "Workflow: label a bug", why: "The rules find the word fails in the issue. The label is bug, every time, with no model call.", question: "Checkout shows a 500 after the coupon. Label this issue.", flags: { shape: "workflow", issue: "issue-103" }, expect: "labelled" },
    { title: "Workflow: label a request", why: "No bug word in the text, so the label is feature. The same input always gives the same label.", question: "Someone asked for a dark theme. What label is that?", flags: { shape: "workflow", issue: "issue-102" }, expect: "labelled" },
    { title: "Workflow: an issue we do not have", why: "Plain code handles missing data the same way each time. No issue means no label.", question: "Label issue 999 for me.", flags: { shape: "workflow", issue: "issue-999" }, expect: "unknown" },
    { title: "One agent: a label off the list", why: "This model wanders and invents a label. Our board has only bug and feature, so the label is wrong. Code cannot do this.", question: "Triage the blurry logo report.", flags: { shape: "agent", task: "label", issue: "issue-101", model: "wanders" }, expect: "off-list" },
    { title: "One agent: reproduce a bug", why: "The path changes. The agent reads the issue, then the CI log, then reports the failing test.", question: "Can you reproduce the checkout error?", flags: { shape: "agent", task: "reproduce", issue: "issue-103" }, expect: "reproduced" },
    { title: "One agent: a bug that will not reproduce", why: "The CI log for the logo issue is green. The agent says so, and does not make up a failure.", question: "Can you reproduce the blurry logo?", flags: { shape: "agent", task: "reproduce", issue: "issue-101" }, expect: "not-reproduced" },
    { title: "Many agents: a fix the auditor passes", why: "The fix names tests/coupon.test.ts. The auditor finds that test failing in the CI log, so the fix goes on.", question: "Please fix the checkout error.", flags: { shape: "multi", issue: "issue-103" }, expect: "passed" },
    { title: "Many agents: the auditor catches a wrong test", why: "The fixer names a test that never failed. A single agent would ship it. The auditor checks the log, and a person says no.", question: "Fix the checkout error for me.", flags: { shape: "multi", issue: "issue-103", model: "invent", approve: "n" }, expect: "rejected" },
    { title: "Many agents: a person overrides", why: "Same wrong fix, but the person says yes. The gate is only as good as the person behind it.", question: "Please fix the coupon problem.", flags: { shape: "multi", issue: "issue-103", model: "invent", approve: "y" }, expect: "approved by person" },
    { title: "Many agents: nothing to fix", why: "The CI log is green, so there is no failing test to aim at. The auditor fails the empty fix and a person decides.", question: "Please fix the blurry logo.", flags: { shape: "multi", issue: "issue-101", approve: "n" }, expect: "rejected" },
  ],
  play(question, flags, ask) {
    const shape = flags.shape || "agent";
    const issueId = flags.issue || "issue-103";
    print(field("Shape", bold(shape), cyan));
    print(field("", SHAPES[shape] || "", dim));
    print(field("Issue", findIssue(issueId) ? `${issueId}: ${findIssue(issueId)!.title}` : `${issueId} (unknown)`));
    print(field("Question", question));
    console.log();
    if (!SHAPES[shape]) {
      box("ERROR", [red(`Unknown shape "${shape}". Use workflow, agent or multi.`)], red);
      return "error";
    }
    if (shape === "workflow") return showWorkflow(issueId);
    if (shape === "agent") return showAgent(flags.task || "label", issueId, flags);
    return showMulti(issueId, flags, ask);
  },
};

function showTrace(trace: Turn[]) {
  for (const turn of trace) console.log(`${badgeBlue(turn.who.toUpperCase())} ${dim(turn.text)}`);
}

function showWorkflow(issueId: string): string {
  const result = labelWorkflow(issueId);
  console.log(`${badgeBlue("CODE")} ${bold("no model call")}`);
  if (result.answer === "unknown") {
    box("NO SUCH ISSUE", [yellow("There is no label for an issue we do not have.")], yellow);
    return "unknown";
  }
  showTrace(result.trace);
  box("LABEL", [...field("label", result.answer, green), ...field("tokens", "0", dim)], green);
  return "labelled";
}

function showAgent(task: string, issueId: string, flags: Record<string, string>): string {
  const result: Triage = runTriageAgent(task, issueId, modelFrom(flags));
  showTrace(result.trace);
  console.log();
  print(field("Tokens paid", String(result.tokens), dim));
  if (task === "label") {
    const good = ISSUE_LABELS.includes(result.answer);
    if (!good) {
      box("OFF THE LIST", [red(`The agent said "${result.answer}". The board has: ${ISSUE_LABELS.join(", ")}.`)], red);
      return "off-list";
    }
    box("LABEL", [green(`${result.answer}, after ${result.trace.length} tool calls.`)], green);
    return "agent-labelled";
  }
  if (result.answer.startsWith("Reproduced")) {
    box("REPRODUCED", [green(result.answer)], green);
    return "reproduced";
  }
  box("NOT REPRODUCED", [yellow(result.answer)], yellow);
  return "not-reproduced";
}

function showMulti(issueId: string, flags: Record<string, string>, ask: Ask): string {
  const result = fixAndReview(issueId, modelFrom(flags), ask);
  for (const turn of result.trace) {
    const badge = turn.who === "auditor" ? badgeMagenta("AUDITOR") : badgeBlue(turn.who.toUpperCase());
    console.log(`${badge} ${dim(turn.text)}`);
  }
  rule();
  if (result.reply === "REJECTED_BY_REVIEW") {
    box("FIX REJECTED", [verdict.blocked("Nothing was merged.")], red);
    return "rejected";
  }
  if (result.passed) {
    box("FIX GOES TO REVIEW", [green(result.reply), verdict.safe("The auditor found the failing test in the log.")], green);
    return "passed";
  }
  box("MERGED AFTER A PERSON OVERRODE THE AUDITOR", [yellow(result.reply), verdict.person("A wrong fix went on because the person said yes.")], yellow);
  return "approved by person";
}
