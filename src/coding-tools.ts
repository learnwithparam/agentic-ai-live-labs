// The Coding Agent's tools and counters, for the stop conditions lab. The lesson is in
// labs/15-stop-conditions.ts. You do not need to read this file.
import type { Message } from "./model";
import { CI_LOGS } from "./team";
import { countTokens } from "../labs/10-context-budget";

export const TOOLS = ["edit_file", "run_tests"];
export const SECONDS_FOR: Record<string, number> = { edit_file: 2, run_tests: 45 };
export const TOKENS_PER_CENT = 100;
export const GOOD_EDIT = "10 percent";

// The tools. An edit is kept in a list. The tests pass only when a good edit is in the list.
export function useTool(name: string, input: string, edits: string[]): string {
  if (name === "edit_file") {
    edits.push(input);
    return `edited coupon-check.ts: ${input}`;
  }
  for (const edit of edits) {
    if (edit.includes(GOOD_EDIT)) return "ok: 41 tests passed";
  }
  return CI_LOGS["build-2"].split("\n")[0];
}

export function tokensIn(messages: Message[]): number {
  let tokens = 0;
  for (const message of messages) tokens += countTokens(message.content);
  return tokens;
}

export function countOf(list: string[], key: string): number {
  let count = 0;
  for (const item of list) {
    if (item === key) count += 1;
  }
  return count;
}

