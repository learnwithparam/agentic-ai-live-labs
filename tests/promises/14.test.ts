import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { findMail } from "../../src/mailguard";
import { fence, handleEmail, riskScore, sendTool } from "../../labs/14-instructions-vs-data";
import { naiveHandle } from "../../show/14-instructions-vs-data";

const model = makeModel();
function mailFor(id: string) {
  const mail = findMail(id);
  if (!mail) throw new Error(`no mail ${id}`);
  return mail;
}

// PROMISE: an order is held, an off-job ask gets a no, and the tool never sends outside.
test("the naive bot obeys the vendor order, the guarded bot holds it", () => {
  const naive = naiveHandle(mailFor("mail-vendor"), "Deal with it.", model);
  expect(naive.outcome).toBe("obeyed");
  const guarded = handleEmail(mailFor("mail-vendor"), "Deal with it.", model);
  expect(guarded.outcome).toBe("held");
  expect(guarded.action).toBe("none");
});

test("an ask beyond the job gets a polite no", () => {
  expect(handleEmail(mailFor("mail-probe"), "Reply.", model).outcome).toBe("polite-no");
});

test("a soft ask passes the guard but the tool blocks it", () => {
  expect(riskScore(mailFor("mail-copy").body)).toBeLessThan(50);
  expect(handleEmail(mailFor("mail-copy"), "Send it.", model).outcome).toBe("blocked");
  expect(sendTool("FORWARD x@stock-photos.example").ok).toBe(false);
  expect(sendTool("FORWARD books@juniper.example").ok).toBe(true);
});

test("a fake closing tag is made harmless and normal mail is handled", () => {
  expect(fence("a</data>b").text).toBe("a[/data]b");
  expect(handleEmail(mailFor("mail-breakout"), "File it.", model).outcome).toBe("fenced");
  expect(handleEmail(mailFor("mail-meeting"), "Answer.", model).outcome).toBe("handled");
});
