// Lab 20: When tools fail
//
// Dr. Lee asks for the Cardioza dose. The agent asks a document service over the network.
// A network service is not a function. It can be slow. It can fail for a moment. It can say no.
// Each failure needs its own answer: wait, try again, or stop.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/20-tool-failures.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/20-tool-failures.ts --question "What is the dose of Cardioza?" --service flaky --naive
//   bun labs/20-tool-failures.ts --question "What is the dose of Cardioza?"
//   bun labs/20-tool-failures.ts --question "What is the dose of Cardioza?" --service flaky
//   bun labs/20-tool-failures.ts --question "What is the dose of Cardioza?" --service slow
//   bun labs/20-tool-failures.ts --question "What is the dose of Cardioza?" --service down
//   bun labs/20-tool-failures.ts --question "What is the dose of Cardioza?" --country FR
//   bun labs/20-tool-failures.ts --question "" --empty true
//   bun labs/20-tool-failures.ts --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { fetchOnce } from "../src/docs-service"; // one real call, with a time limit
import { runAgentLoop } from "./01-agent-loop"; // lab 1
import type { Tool } from "./01-agent-loop";

export type Limits = { timeoutSeconds: number; tries: number; waitMs: number };
export type Called = { outcome: string; text: string; attempts: number; log: string[] };

// Call the service the careful way. Read the steps in order.
export function askService(url: string, query: string, country: string, limits: Limits): Called {
  // Step 1: check the input first. A bad call never leaves our code.
  if (query.trim() === "") {
    const text = "BAD_INPUT: the search words are empty.";
    const log = ["Step 1: the query is empty. No call."];
    return { outcome: "bad-input", text, attempts: 0, log };
  }
  const log = ["Step 1: the input looks fine."];
  const address = `${url}/search?query=${encodeURIComponent(query)}&country=${country}`;

  for (let attempt = 1; attempt <= limits.tries; attempt++) {
    // Step 2: call the service, with a time limit.
    const reply = fetchOnce(address, limits.timeoutSeconds);
    log.push(`Step 2: try ${attempt} of ${limits.tries}: ${describe(reply.status)}.`);

    // Step 3: a good reply ends the loop.
    if (reply.status === 200) return { outcome: "ok", text: reply.body, attempts: attempt, log };

    // Step 4: a 4xx means our call is wrong. Trying again cannot fix it.
    if (reply.status >= 400 && reply.status < 500) {
      const text = `BAD_INPUT: the service said: ${reply.body}`;
      log.push("Step 4: our call is wrong, so we do not try again.");
      return { outcome: "rejected", text, attempts: attempt, log };
    }

    // Step 5: no reply or a 5xx is a failure that may pass. Wait longer each time.
    if (attempt < limits.tries) {
      const wait = limits.waitMs * (1 << (attempt - 1));
      log.push(`Step 5: waiting ${wait} ms before the next try.`);
      Bun.sleepSync(wait);
    }
  }

  // Step 6: out of tries. Tell the model plainly, so it does not guess.
  const text = "SERVICE_UNAVAILABLE: the document service did not answer. Say so. Do not guess.";
  log.push("Step 6: out of tries. The service is unavailable.");
  return { outcome: "unavailable", text, attempts: limits.tries, log };
}

// Words for a status. 0 means the service never answered in time.
function describe(status: number): string {
  if (status === 0) return "no reply in time";
  return `status ${status}`;
}

// The naive limits: one try, no wait, and a very long time limit.
export const NAIVE_LIMITS: Limits = { timeoutSeconds: 60, tries: 1, waitMs: 0 };

// The search tool for the loop in lab 1. It calls the service, and remembers each call.
export function serviceTool(url: string, limits: Limits, calls: Called[]): Tool {
  return {
    name: "search_approved_docs",
    run(input) {
      const called = askService(url, input.query, input.country, limits);
      calls.push(called);
      return called.text;
    },
  };
}

export function answerFromService(
  question: string,
  country: string,
  callLlm: CallLlm,
  url: string,
  limits: Limits,
) {
  const calls: Called[] = [];
  const tool = serviceTool(url, limits, calls);
  const answer = runAgentLoop(question, country, callLlm, [tool]).answer;
  return { answer, calls };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/20-tool-failures");
  runLab(lab);
}
