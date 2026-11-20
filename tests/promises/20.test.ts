import { afterAll, expect, test } from "bun:test";
import { startService } from "../../src/mail-service";
import { sendFollowUp } from "../../labs/20-tool-failures";
import { naiveSend } from "../../show/20-tool-failures";

// Real services on real ports, with small waits so the test is quick.
const limits = { timeoutSeconds: 1, tries: 3, waitMs: 20 };
const busy = startService("busy");
const down = startService("down");
const slow = startService("slow", 20000);
const healthy = startService("ok");
afterAll(() => [busy, down, slow, healthy].forEach((service) => service.stop()));

// PROMISE: an unknown lead never reaches the service. A slow call stops at the time limit.
// A failure that may pass is tried again. A bounced address is never tried again.
test("an unknown lead makes no call, and a bounce is never tried again", () => {
  const unknown = sendFollowUp(healthy.url, "trade-show-lead", limits);
  expect(unknown).toMatchObject({ outcome: "bad-input", attempts: 0 });
  const bounced = sendFollowUp(healthy.url, "xylo-music", limits);
  expect(bounced).toMatchObject({ outcome: "bounced", attempts: 1 });
  expect(sendFollowUp(healthy.url, "harbor-dental", limits)).toMatchObject({ outcome: "sent", attempts: 1 });
});

test("a busy service is retried until it works, and one try is not enough", () => {
  const fixed = sendFollowUp(busy.url, "maple-legal", limits);
  expect(fixed).toMatchObject({ outcome: "sent", attempts: 3 });
  expect(fixed.text).toContain("hello@maple-legal.example");
  const single = startService("busy");
  const oneTry = { timeoutSeconds: 1, tries: 1, waitMs: 0 };
  expect(sendFollowUp(single.url, "maple-legal", oneTry).outcome).toBe("gave-up");
  single.stop();
});

test("a slow service stops at the time limit, and a service that is down gives up", () => {
  const started = Date.now();
  const tight = { timeoutSeconds: 1, tries: 2, waitMs: 10 };
  expect(sendFollowUp(slow.url, "cedar-books", tight).outcome).toBe("gave-up");
  // Without the limit, two tries would wait 40 seconds. A busy machine still stays far below that.
  expect(Date.now() - started).toBeLessThan(15000);
  const gone = sendFollowUp(down.url, "atlas-movers", limits);
  expect(gone).toMatchObject({ outcome: "gave-up", attempts: 3 });
});

test("the naive bot asks a dead address again and again", () => {
  const naive = naiveSend(healthy.url, "quill-stationery", 5);
  expect(naive).toMatchObject({ outcome: "retried-a-no", attempts: 5 });
});
