import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { GOOD_HOOKS, NO_HOOKS, runWithHooks } from "../../labs/26-hooks";
import { hideSecrets } from "../../src/hook-tools";
import type { Before } from "../../labs/26-hooks";

const naive = "Fix the coupon test, check .env for the key, then force push to main";
const model = makeModel("ok");

function pushedToMain(pushes: string[]): boolean {
  for (const push of pushes) {
    if (push.includes("--force") && push.includes("main")) return true;
  }
  return false;
}

// PROMISE: every tool call passes the before hooks and every output passes the after hooks.
// A hook that crashes blocks the call.
test("with no hooks the push runs and the key reaches the model, and with hooks it does not", () => {
  const open = runWithHooks(naive, model, NO_HOOKS);
  expect(pushedToMain(open.pushes)).toBe(true);
  expect(open.seen.join(" ")).toContain("sk_live_51Hx9aQ2zLm");
  const closed = runWithHooks(naive, model, GOOD_HOOKS);
  expect(closed.pushes.length).toBe(0);
  expect(closed.blocked).toContain("git push --force origin main");
  expect(closed.seen.join(" ")).not.toContain("sk_live_");
  expect(closed.seen.join(" ")).toContain("[SECRET]");
});

test("a push to a branch is allowed, even with force", () => {
  const plain = runWithHooks("Push the coupon fix to branch fix-coupon", model, GOOD_HOOKS);
  expect(plain.pushes).toEqual(["git push origin fix-coupon"]);
  const forced = runWithHooks("Force push my rebased branch fix-coupon", model, GOOD_HOOKS);
  expect(forced.pushes).toEqual(["git push --force origin fix-coupon"]);
});

test("a chained command and a plus sign are still caught", () => {
  const chain = runWithHooks("Push fix-coupon, then force push main, all in one command", model, GOOD_HOOKS);
  expect(chain.pushes.length).toBe(0);
  const plus = runWithHooks("Push main with a plus sign", model, GOOD_HOOKS);
  expect(plus.pushes.length).toBe(0);
  expect(plus.blocked.length).toBe(1);
});

test("a token in a build log is hidden and the useful line stays", () => {
  const ran = runWithHooks("Show me why build 3 failed", model, GOOD_HOOKS);
  expect(ran.seen.join(" ")).not.toContain("ghp_a1b2");
  expect(ran.seen.join(" ")).toContain("TypeError: price is undefined");
  expect(hideSecrets("MODE=test")).toBe("MODE=test");
});

test("a hook that crashes blocks every call", () => {
  const broken: Before = { name: "broken", check() { throw new Error("bug"); } };
  const ran = runWithHooks("Fix the coupon test, then push the coupon fix to branch fix-coupon", model, { before: [broken], after: [] });
  expect(ran.pushes.length).toBe(0);
  expect(ran.blocked.length).toBe(2);
});

test("with no after hook, the before hook still stops the force push", () => {
  const ran = runWithHooks(naive, model, { before: GOOD_HOOKS.before, after: [] });
  expect(ran.pushes.length).toBe(0);
  expect(ran.blocked.length).toBe(1);
});
