import { afterAll, expect, test } from "bun:test";
import { startService } from "../../src/docs-service";
import { askService, NAIVE_LIMITS } from "../../labs/20-tool-failures";

// Real services on real ports, with small waits so the test is quick.
const limits = { timeoutSeconds: 1, tries: 3, waitMs: 20 };
const flaky = startService("flaky");
const down = startService("down");
const slow = startService("slow", 2000);
const healthy = startService("ok");
afterAll(() => [flaky, down, slow, healthy].forEach((service) => service.stop()));

// PROMISE: bad input never leaves our code. A slow call stops at the time limit.
// A failure that may pass is tried again. A no from the service is never tried again.
test("lab 20: bad input makes no call, and a no is never tried again", () => {
  const empty = askService(healthy.url, "  ", "US", limits);
  expect(empty).toMatchObject({ outcome: "bad-input", attempts: 0 });
  const no = askService(healthy.url, "Cardioza dose", "FR", limits);
  expect(no).toMatchObject({ outcome: "rejected", attempts: 1 });
  expect(askService(healthy.url, "Cardioza dose", "US", limits)).toMatchObject({ outcome: "ok", attempts: 1 });
});

test("lab 20: a flaky service is retried until it works, and one try is not enough", () => {
  const fixed = askService(flaky.url, "Cardioza dose", "US", limits);
  expect(fixed).toMatchObject({ outcome: "ok", attempts: 3 });
  expect(fixed.text).toContain("DOC-101");
  const naive = startService("flaky");
  expect(askService(naive.url, "Cardioza dose", "US", NAIVE_LIMITS).outcome).toBe("unavailable");
  naive.stop();
});

test("lab 20: a slow service stops at the time limit, and a service that is down gives up", () => {
  const started = Date.now();
  const tight = { timeoutSeconds: 1, tries: 2, waitMs: 10 };
  expect(askService(slow.url, "Cardioza dose", "US", tight).outcome).toBe("unavailable");
  expect(Date.now() - started).toBeLessThan(3500);
  const gone = askService(down.url, "Cardioza dose", "US", limits);
  expect(gone).toMatchObject({ outcome: "unavailable", attempts: 3 });
});
