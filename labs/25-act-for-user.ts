// Act for the user
//
// Dr. Weber works in Germany. She asks the bot: "What is the Cardioza dose in the US?"
// The US label says 10mg. The German label says 5mg. She must see the German one.
// If the bot runs on its own service key, it answers the question as typed. Dr. Weber gets 10mg.
// So the bot carries a token that names the doctor it acts for. The doctor's country comes from
// the CRM record behind that token. What the doctor or the model types cannot change it.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/25-act-for-user.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab act-for-user --question "What is the Cardioza dose in the US?" --hcp dr-weber --naive
//   bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp dr-lee
//   bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp dr-weber
//   bun run lab act-for-user --question "What is the Cardioza dose in the US?" --hcp dr-weber
//   bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp dr-unknown
//   bun run lab act-for-user --question "What is the dose of Cardioza?" --hcp dr-weber --forge true
//   bun run lab act-for-user --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { botSecret, issue, verify } from "../src/identity";
import { BOT_SCOPES } from "./24-identity-and-scopes"; // what each bot may do
import { runAgentLoop, searchApprovedDocs } from "./01-agent-loop";
import type { Tool } from "./01-agent-loop";
import { CRM } from "../src/data";

export type Acted = { outcome: string; answer: string; log: string[] };

// After the doctor signs in, our server makes a token that names her and the bot.
export function tokenForUser(bot: string, hcpId: string, now: number): string {
  const claims = { bot, scopes: BOT_SCOPES[bot], expires: now + 300, user: hcpId };
  return issue(claims, botSecret());
}

// Answer for the doctor the token names. Read the steps in order.
export function actForUser(token: string, question: string, callLlm: CallLlm, now: number): Acted {
  // Step 1: check the token. A changed or old token is a stranger.
  const who = verify(token, botSecret(), now);
  if (!who.ok) return stop("denied", `Step 1: ${who.reason}.`);

  // Step 2: the token names a doctor. She must be in the CRM.
  const doctor = CRM[who.claims.user || ""];
  if (doctor === undefined) return stop("denied", "Step 2: the doctor is not in the CRM.");

  // Step 3: the bot must be allowed to read documents at all.
  if (!who.claims.scopes.includes("docs.read")) {
    return stop("denied", `Step 3: the ${who.claims.bot} bot has no docs.read.`);
  }

  // Step 4: the search uses the doctor's own country. The country the model writes is dropped.
  const mine: Tool = {
    name: "search_approved_docs",
    run(input) {
      return searchApprovedDocs(input.query, doctor.country);
    },
  };
  const log = [`Step 3: the ${who.claims.bot} bot may read documents.`];
  log.push(`Step 4: searching for ${doctor.name}, so only ${doctor.country} documents.`);
  const loop = runAgentLoop(question, doctor.country, callLlm, [mine]);
  return { outcome: "answered", answer: loop.answer, log };
}

function stop(outcome: string, reason: string): Acted {
  return { outcome, answer: "NOT ANSWERED", log: [reason] };
}

// The naive way: one service key, and the country is whatever the request says.
export function actNaive(question: string, asked: string, callLlm: CallLlm): Acted {
  const tool: Tool = {
    name: "search_approved_docs",
    run(input) {
      return searchApprovedDocs(input.query, asked);
    },
  };
  const loop = runAgentLoop(question, asked, callLlm, [tool]);
  return { outcome: "answered", answer: loop.answer, log: [`The service key searched ${asked}.`] };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/25-act-for-user");
  runLab(lab);
}
