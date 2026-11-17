// What you see on screen for the tool failures lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/20-tool-failures.ts.

import { modelFrom, type Flags, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, print, red, rule, yellow } from "../src/ui";
import { askService, answerFromService, NAIVE_LIMITS } from "../labs/20-tool-failures";
import type { Limits } from "../labs/20-tool-failures";
import { startService } from "../src/docs-service";

const DOSE = "What is the dose of Cardioza?";
const LIMITS: Limits = { timeoutSeconds: 1, tries: 3, waitMs: 200 };

export const lab: Lab = {
  file: "20-tool-failures.ts",
  title: "When tools fail",
  about:
    "Each example starts a real document service on your computer. Pick how it behaves with --service: ok, flaky (fails twice), slow (answers after three seconds) or down.",
  terms: "timeout = the most time we will wait. retry = try the same call again. backoff = wait longer before each retry. transient = a failure that may pass.",
  challenge: "A service can be slow, fail for a moment, or say no. One try with no time limit hangs on the slow one and gives up on the flaky one.",
  promise: "Bad input never leaves our code. A slow call stops at the time limit. A failure that may pass is tried again, with growing waits. A no is never tried again.",
  production: "Add a circuit breaker for a service that stays down. Add a random wait so many agents do not retry together.",
  cases: [
    { title: "NAIVE: one try, no time limit", why: "The service fails once, as services do. One try gives up on the first 503, and the doctor gets no dose.", question: DOSE, flags: { service: "flaky", naive: "true" }, expect: "unavailable" },
    { title: "A healthy service", why: "The first try works. No waiting, no retry.", question: DOSE, expect: "ok" },
    { title: "A flaky service", why: "The first two tries fail with 503. We wait 200 ms, then 400 ms. The third try works.", question: DOSE, flags: { service: "flaky" }, expect: "ok" },
    { title: "A slow service", why: "The service takes three seconds. We stop each try after one second. After three tries we say so and do not guess.", question: DOSE, flags: { service: "slow" }, expect: "unavailable" },
    { title: "A service that is down", why: "Every try fails. After three tries we stop and say the service is unavailable.", question: DOSE, flags: { service: "down" }, expect: "unavailable" },
    { title: "EDGE: the service says no", why: "France is not a country we serve. The service answers 400. Trying again cannot help, so we stop at once.", question: DOSE, flags: { country: "FR" }, expect: "rejected" },
    { title: "EDGE: empty search words", why: "The input check stops an empty query before any call is made.", question: "What is the dose of Cardioza?", flags: { empty: "true" }, expect: "bad-input" },
  ],
  play(question, flags) {
    print(field("Question", question || "(empty)"));
    const service = startService(flags.service || "ok");
    try {
      return flags.empty ? showEmpty(service.url) : showRun(question, flags, service.url);
    } finally {
      service.stop();
    }
  },
};

function showEmpty(url: string): string {
  const called = askService(url, "", "US", LIMITS);
  rule("LOG, STEP BY STEP");
  for (const line of called.log) console.log(dim(line));
  box(badgeYellow("BAD INPUT"), [yellow("No call was made. The model is told why.")], yellow);
  return called.outcome;
}

function showRun(question: string, flags: Flags, url: string): string {
  const limits = flags.naive ? NAIVE_LIMITS : LIMITS;
  const started = Date.now();
  const country = flags.country || "US";
  const result = answerFromService(question, country, modelFrom(flags), url, limits);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const last = result.calls[result.calls.length - 1];

  rule("LOG, STEP BY STEP");
  for (const called of result.calls) for (const line of called.log) console.log(dim(line));
  console.log();
  print(field("Answer", result.answer));
  print(field("Time", `${seconds} seconds`));
  if (last === undefined) {
    box(badgeYellow("NO CALL"), [yellow("The model did not call the service.")], yellow);
    return "no-call";
  }
  if (last.outcome === "ok") box(badgeGreen("OK"), [`Worked on try ${last.attempts}.`], yellow);
  else if (last.outcome === "rejected") box(badgeYellow("REJECTED"), [yellow("The service said no. We did not retry.")], yellow);
  else box(badgeRed("UNAVAILABLE"), [red("No answer from the service. The model must say so.")], red);
  return last.outcome;
}
