// What you see on screen for lab 28: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/28-evals-and-release.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, box, dim, field, green, print, red, rule } from "../src/ui";
import { EVALS, decide, runEvals, shipIfItRuns } from "../labs/28-evals-and-release";

const ASK = "Is this new version ready to release?";

export const lab: Lab = {
  file: "28-evals-and-release.ts",
  title: "Lab 28: evals and the release gate",
  about:
    "Each example is a new version of the document search. Pick it with --version: current, wide or invents. We run every eval question through it, then decide if it may ship.",
  terms: "eval = a real question with the facts a right answer must have. eval set = the list of evals. release gate = the check that blocks a bad version. regression = something that worked and now does not.",
  challenge: "A change that looks fine ships because it still answers. It gives a German doctor the US dose, and nobody finds out until she does.",
  promise: "A version ships only when every eval passes. A failed eval blocks it and names the question. An empty eval set blocks everything.",
  production: "Run the evals on every change, on the same model you ship. Add a new eval each time a bug gets out. Never delete one to make a release pass.",
  cases: [
    { title: "NAIVE: ship if it runs", why: "The wide version answers every question, so the naive gate ships it. Dr. Weber gets the US dose.", question: ASK, flags: { version: "wide", naive: "true" }, expect: "shipped-wrong" },
    { title: "The current version", why: "Every eval passes, so the release goes out.", question: ASK, flags: { version: "current" }, expect: "released" },
    { title: "EDGE: the wide version", why: "Dr. Weber's question gets the US document. That eval fails and the release is blocked.", question: ASK, flags: { version: "wide" }, expect: "blocked" },
    { title: "EDGE: the version that makes things up", why: "For an unknown drug it writes a made-up document and a dose. The Zorbex eval fails.", question: ASK, flags: { version: "invents" }, expect: "blocked" },
    { title: "EDGE: nobody wrote any evals", why: "Zero evals pass, but nothing was tested. An empty set blocks the release.", question: ASK, flags: { version: "current", evals: "none" }, expect: "blocked" },
  ],
  play(question, flags) {
    const version = flags.version || "current";
    print(field("Question", question));
    print(field("Version", version));
    const evals = flags.evals === "none" ? [] : EVALS;
    const results = runEvals(version, evals, modelFrom(flags));
    rule("LOG, STEP BY STEP");
    for (const result of results) {
      const mark = result.passed ? green("PASS") : red("FAIL");
      console.log(`${mark} ${dim(`${result.hcp}: ${result.ask}`)} ${dim(result.why)}`);
      console.log(dim(`     answer: ${result.answer.slice(0, 80)}`));
    }
    const decision = flags.naive ? shipIfItRuns(results) : decide(results);
    console.log();
    print(field("Decision", decision.reason));
    if (decision.release && version !== "current") {
      box(badgeRed("SHIPPED A BUG"), [red("A broken version went out.")], red);
      return "shipped-wrong";
    }
    if (decision.release) {
      box(badgeGreen("RELEASED"), [green("Every eval passed.")], green);
      return "released";
    }
    box(badgeRed("BLOCKED"), [red(`Not released: ${decision.reason}.`)], red);
    return "blocked";
  },
};
