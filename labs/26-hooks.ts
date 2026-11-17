// Lab 26: Hooks
//
// The doctor asks the agent to read a call note. Then the agent must email it to a Gmail address.
// The note holds a patient name and an SSN. The address is a private mailbox, not the hospital.
// A rule in the prompt is only a hope. A hook is code that runs on every tool call.
// A before hook can block a call. An after hook can change what the tool gave back.
// If a hook itself crashes, the call is blocked. A broken check must never mean "go ahead".
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/26-hooks.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/26-hooks.ts --question "Please read the last call note for Dr. Lee and email it to dr.lee.notes@gmail.com." --naive
//   bun labs/26-hooks.ts --question "Can you read the last call note for Dr. Lee?"
//   bun labs/26-hooks.ts --question "Please read the last call note for Dr. Lee and email it to lee@hospital-example.org."
//   bun labs/26-hooks.ts --question "Please read the last call note for Dr. Lee and email it to dr.lee.notes@gmail.com."
//   bun labs/26-hooks.ts --question "What is the dose of Cardioza?"
//   bun labs/26-hooks.ts --question "Please read the last call note for Dr. Lee and email it to lee@hospital-example.org." --broken true
//   bun labs/26-hooks.ts --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { redactPhi } from "./02-guardrails"; // the private-detail finder from lab 2
import { TOOLS, addressIn, runTool } from "../src/mailtools";
import type { After, Before, Call, Hooks, Mail, Ran } from "../src/mailtools";

const APPROVED_DOMAINS = ["hospital-example.org"];

// Run the tools the model asks for, with hooks around each one. Read the steps in order.
export function runWithHooks(question: string, callLlm: CallLlm, hooks: Hooks, sent: Mail[]): Ran {
  const ran: Ran = { sent, outputs: [], blocked: [], log: [] };

  // Step 1: the model says which tools the request needs.
  const tools = TOOLS.join(", ");
  const prompt = `ACT: List the tools this request needs.\nTools: ${tools}\nQuestion: ${question}`;
  const wanted = callLlm([{ role: "user", content: prompt }], []).text || "";
  ran.log.push(`Step 1: the model asked for: ${wanted.split("\n").join(", ")}.`);

  let last = "";
  for (const tool of TOOLS) {
    if (!wanted.includes(tool)) continue;
    const call: Call = { tool, to: addressIn(question), text: last };

    // Step 2: before hooks. The first one that objects stops the call.
    const stopped = runBefore(hooks.before, call);
    if (stopped !== "") {
      ran.blocked.push(tool);
      ran.log.push(`Step 2: ${tool} was blocked. ${stopped}`);
      continue;
    }

    // Step 3: the tool runs. Step 4: after hooks may change what comes out.
    const output = runAfter(hooks.after, call, runTool(call, sent));
    ran.log.push(`Step 3 and 4: ${tool} ran. What came out: ${output}`);
    ran.outputs.push(output);
    last = output;
  }
  return ran;
}

function runBefore(hooks: Before[], call: Call): string {
  for (const hook of hooks) {
    let reason = "";
    try {
      reason = hook.check(call);
    } catch (error) {
      reason = "the hook crashed, so we say no"; // fail closed
    }
    if (reason !== "") return `${hook.name}: ${reason}.`;
  }
  return "";
}

function runAfter(hooks: After[], call: Call, output: string): string {
  let current = output;
  for (const hook of hooks) {
    try {
      current = hook.fix(call, current);
    } catch (error) {
      return "OUTPUT WITHHELD: an after hook crashed.";
    }
  }
  return current;
}

// The hooks. Each is one small check with one name.
export const onlyApprovedDomains: Before = {
  name: "approved-domain",
  check(call) {
    if (call.tool !== "send_email") return "";
    const domain = call.to.split("@")[1] || "";
    if (APPROVED_DOMAINS.includes(domain)) return "";
    return `${call.to} is not on an approved domain`;
  },
};

export const noPrivateInEmail: Before = {
  name: "no-private-details",
  check(call) {
    if (call.tool !== "send_email") return "";
    if (redactPhi(call.text).found.length === 0) return "";
    return "the email still holds private details";
  },
};

export const hidePrivateOutput: After = {
  name: "hide-private",
  fix(call, output) {
    return redactPhi(output).clean;
  },
};

export const GOOD_HOOKS: Hooks = {
  before: [onlyApprovedDomains, noPrivateInEmail],
  after: [hidePrivateOutput],
};

// The naive way: no hooks. Every call the model asks for runs, and every output is kept.
export const NO_HOOKS: Hooks = { before: [], after: [] };

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/26-hooks");
  runLab(lab);
}
