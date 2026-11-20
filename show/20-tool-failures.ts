// What you see on screen for the tool failures lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/20-tool-failures.ts.

import type { Flags, Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { fetchOnce, startService } from "../src/mail-service";
import { sendFollowUp } from "../labs/20-tool-failures";
import type { Limits, Sent } from "../labs/20-tool-failures";
import { emailOf } from "../src/team";

const LIMITS: Limits = { timeoutSeconds: 1, tries: 3, waitMs: 200 };
export const NAIVE_CAP = 8;

// The naive way: any failure is tried again at once, with no wait and no stop for a no.
// It only ends because this demo cuts it off after a few tries.
export function naiveSend(url: string, leadId: string, cap = NAIVE_CAP): Sent {
  const link = `${url}/send?to=${encodeURIComponent(emailOf(leadId))}`;
  const log: string[] = [];
  for (let attempt = 1; attempt <= cap; attempt++) {
    const reply = fetchOnce(link, 60);
    log.push(`Try ${attempt}: status ${reply.status}.`);
    if (reply.status === 200) return { outcome: "sent", text: reply.body, attempts: attempt, log };
  }
  const text = "Still failing. The real bot would keep going.";
  return { outcome: "retried-a-no", text, attempts: cap, log };
}

export const lab: Lab = {
  file: "20-tool-failures.ts",
  title: "When tools fail",
  about:
    "Each example starts a real mail service on your computer. Pick how it behaves with --service: ok, busy (says 429 twice), slow (answers after three seconds) or down.",
  terms: ["timeout", "retry", "backoff", "transient"],
  challenge:
    "Follow-ups hit 429s, slow replies and bounces. A transient failure passes if we wait. A bounced address never does. A bot that retries everything hammers a dead address and delays the real leads.",
  promise:
    "An unknown lead never reaches the service. A slow call stops at its timeout. A 429 or a 5xx is retried, with a backoff. A bounced address is never tried again.",
  production:
    "Keep the bounced addresses in a list, so no later run tries them. Add a random wait so many bots do not retry together.",
  cases: [
    { title: "NAIVE: retry everything at once", why: "Quill Stationery bounced last week. The naive bot hears no, and asks again and again, with no wait.", question: "Follow up with Quill Stationery about the quote.", flags: { service: "ok", lead: "quill-stationery", naive: "true" }, expect: "retried-a-no" },
    { title: "A healthy service", why: "The first try works. No waiting, no retry.", question: "Nudge Harbor Dental about the new price list.", flags: { lead: "harbor-dental" }, expect: "sent" },
    { title: "A busy service", why: "The first two tries get a 429. We wait 200 ms, then 400 ms. The third try works.", question: "Remind Maple Legal about the contract draft.", flags: { service: "busy", lead: "maple-legal" }, expect: "sent" },
    { title: "A slow service", why: "The service takes three seconds. We stop each try after one second. After three tries the lead stays in the queue.", question: "Check in with Cedar Books after the demo.", flags: { service: "slow", lead: "cedar-books" }, expect: "gave-up" },
    { title: "A service that is down", why: "Every try fails with a 503. After three tries we stop and keep the lead for later.", question: "Thank Atlas Movers for the call last week.", flags: { service: "down", lead: "atlas-movers" }, expect: "gave-up" },
    { title: "EDGE: the address bounced", why: "Xylo Music has a dead mailbox. The service says no with a 422. Trying again cannot help, so we stop at once.", question: "Ask Xylo Music if they still want the trial.", flags: { lead: "xylo-music" }, expect: "bounced" },
    { title: "EDGE: a lead we do not know", why: "The lead id is not in our list. The check stops it before any call is made.", question: "Send a note to the lead from the trade show.", flags: { lead: "trade-show-lead" }, expect: "bad-input" },
  ],
  play(question, flags) {
    print(field("Task", question));
    print(field("Lead", flags.lead || "(none)"));
    const service = startService(flags.service || "ok");
    try {
      return showRun(flags, service.url);
    } finally {
      service.stop();
    }
  },
};

function showRun(flags: Flags, url: string): string {
  const started = Date.now();
  const leadId = flags.lead || "";
  const result = flags.naive ? naiveSend(url, leadId) : sendFollowUp(url, leadId, LIMITS);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  rule("LOG, STEP BY STEP");
  for (const line of result.log) console.log(dim(line));
  console.log();
  print(field("Result", result.text));
  print(field("Time", `${seconds} seconds`));
  if (result.outcome === "sent") box(badgeGreen("SENT"), [green(`Worked on try ${result.attempts}.`)], green);
  else if (result.outcome === "bounced") box(badgeYellow("BOUNCED"), [yellow("The address is dead. We did not retry.")], yellow);
  else if (result.outcome === "bad-input") box(badgeYellow("BAD INPUT"), [yellow("No call was made.")], yellow);
  else if (result.outcome === "retried-a-no") box(badgeRed("RETRIED A NO"), [red(`${result.attempts} tries on a dead address.`)], red);
  else box(badgeRed("GAVE UP"), [red("Not sent. The lead stays in the queue.")], red);
  return result.outcome;
}
