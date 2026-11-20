// Hooks
//
// Juniper's Coding Agent fixes the coupon test and pushes the fix. It can run shell commands and
// read files. Two things must never happen. A force push must never rewrite main. A secret,
// such as an API key, must never reach the model. The model could repeat it anywhere.
// A rule in the prompt is only a hope. A hook is code that runs on every tool call.
// A before hook can block a call. An after hook can change what the tool gave back.
// If a hook itself crashes, the call is blocked. A broken check must never mean "go ahead".
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/26-hooks.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab hooks --question "Fix the coupon test, check .env for the key, then force push to main" --naive
//   bun run lab hooks --question "Fix the coupon test, then force push the fix to main"
//   bun run lab hooks --question "Force push my rebased branch fix-coupon"
//   bun run lab hooks --question "Read .env to see which Stripe mode is on"
//   bun run lab hooks --question "Show me why build 3 failed"
//   bun run lab hooks --question "Please run the coupon test now" --broken true
//   bun run lab hooks --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { hideSecrets, runTool, TOOLS } from "../src/hook-tools";
import type { ToolCall as Call } from "../src/hook-tools";
export type Before = { name: string; check(call: Call): string };
export type After = { name: string; fix(call: Call, output: string): string };
export type Hooks = { before: Before[]; after: After[] };
// pushes: every push that ran. seen: everything the model was shown. blocked: the calls we stopped.
export type Ran = { pushes: string[]; seen: string[]; blocked: string[]; log: string[] };


// Run the tool calls the model asks for, with hooks around each one. Read the steps in order.
export function runWithHooks(task: string, callLlm: CallLlm, hooks: Hooks): Ran {
  const ran: Ran = { pushes: [], seen: [], blocked: [], log: [] };

  // Step 1: the model writes the tool calls this task needs, one on each line.
  const ask = "Write one tool call on each line, as: tool | input";
  const prompt = `DO: ${ask}\nTools: ${TOOLS.join(", ")}\nTask: ${task}`;
  const lines = (callLlm([{ role: "user", content: prompt }], []).text || "").split("\n");
  ran.log.push(`Step 1: the model asked for ${lines.length} tool calls.`);

  for (const line of lines) {
    if (line.trim() === "") continue;
    const parts = line.split(" | ");
    const call: Call = { tool: parts[0], input: parts[1] || "" };

    // Step 2: before hooks. The first one that objects stops the call.
    const stopped = runBefore(hooks.before, call);
    if (stopped !== "") {
      ran.blocked.push(call.input);
      ran.log.push(`Step 2: "${call.input}" was blocked. ${stopped}`);
      ran.seen.push(`BLOCKED: ${stopped}`);
      continue;
    }

    // Step 3: the tool runs. Step 4: after hooks may change what comes out.
    const output = runAfter(hooks.after, call, runTool(call, ran.pushes));
    ran.log.push(`Step 3 and 4: ${call.tool} ran. The model sees: ${output}`);

    // Step 5: only now does the output go to the model.
    ran.seen.push(output);
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
export const noForcePushToMain: Before = {
  name: "no-force-push-to-main",
  check(call) {
    if (call.tool !== "run_shell" || !call.input.includes("git push")) return "";
    let force = false;
    let main = false;
    for (const word of call.input.split(" ")) {
      if (word === "--force" || word === "-f" || word.startsWith("--force-")) force = true;
      if (word.startsWith("+")) force = true; // +main is a force push in disguise
      if (word === "main" || word === "+main") main = true;
    }
    if (force && main) return "a force push to main would rewrite shared history";
    return "";
  },
};

export const hideSecretsInOutput: After = {
  name: "hide-secrets",
  fix(call, output) {
    return hideSecrets(output);
  },
};

export const GOOD_HOOKS: Hooks = {
  before: [noForcePushToMain],
  after: [hideSecretsInOutput],
};

// The naive way: no hooks. Every call the model asks for runs, and every output reaches the model.
export const NO_HOOKS: Hooks = { before: [], after: [] };

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/26-hooks");
  runLab(lab);
}
