import { afterAll, expect, test } from "bun:test";
import { startService } from "../../src/docs-service";
import { askService, NAIVE_LIMITS } from "../../labs/20-tool-failures";

// Real services on real ports, with small waits so the test is quick.
const limits = { timeoutSeconds: 1, tries: 3, waitMs: 20 };
const flaky = startService("flaky");
const down = startService("down");
const slow = startService("slow", 20000);
const healthy = startService("ok");
afterAll(() => [flaky, down, slow, healthy].forEach((service) => service.stop()));

// PROMISE: bad input never leaves our code. A slow call stops at the time limit.
// A failure that may pass is tried again. A no from the service is never tried again.
test("bad input makes no call, and a no is never tried again", () => {
  const empty = askService(healthy.url, "  ", "US", limits);
  expect(empty).toMatchObject({ outcome: "bad-input", attempts: 0 });
  const no = askService(healthy.url, "What is the dose of Cardioza?", "FR", limits);
  expect(no).toMatchObject({ outcome: "rejected", attempts: 1 });
  expect(askService(healthy.url, "What is the dose of Cardioza?", "US", limits)).toMatchObject({ outcome: "ok", attempts: 1 });
});

test("a flaky service is retried until it works, and one try is not enough", () => {
  const fixed = askService(flaky.url, "What is the dose of Cardioza?", "US", limits);
  expect(fixed).toMatchObject({ outcome: "ok", attempts: 3 });
  expect(fixed.text).toContain("DOC-101");
  const naive = startService("flaky");
  expect(askService(naive.url, "What is the dose of Cardioza?", "US", NAIVE_LIMITS).outcome).toBe("unavailable");
  naive.stop();
});

test("a slow service stops at the time limit, and a service that is down gives up", () => {
  const started = Date.now();
  const tight = { timeoutSeconds: 1, tries: 2, waitMs: 10 };
  expect(askService(slow.url, "What is the dose of Cardioza?", "US", tight).outcome).toBe("unavailable");
  // Without the limit, two tries would wait 40 seconds. A busy machine still stays far below that.
  expect(Date.now() - started).toBeLessThan(15000);
  const gone = askService(down.url, "What is the dose of Cardioza?", "US", limits);
  expect(gone).toMatchObject({ outcome: "unavailable", attempts: 3 });
});
