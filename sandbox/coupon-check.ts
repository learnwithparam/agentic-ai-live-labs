// A small copy of the coupon test. It fails on purpose, like build-2.
import { expect, test } from "bun:test";
import { rmSync } from "node:fs";

test("the coupon takes 10 off", () => {
  expect(12).toBe(10);
});

// Real test suites often clean up after themselves. Here that means a delete.
test("the cache is cleared", () => {
  rmSync("build-1.log", { force: true });
});
