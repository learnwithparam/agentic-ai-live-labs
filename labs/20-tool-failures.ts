// When tools fail
//
// The Sales Outbound bot sends follow-up emails to leads that went quiet. It uses a mail service.
// A network service is not a function. It can be slow. It can say "too many requests" (a 429).
// Some of those failures pass if we wait. A bounced address never passes, so we must stop.
// Each failure needs its own answer: wait and try again, or stop at once.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/20-tool-failures.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab tool-failures --question "Send the follow-up to Quill Stationery." --lead quill-stationery --naive
//   bun run lab tool-failures --question "Send the follow-up to Harbor Dental." --lead harbor-dental
//   bun run lab tool-failures --question "Send the follow-up to Maple Legal." --lead maple-legal --service busy
//   bun run lab tool-failures --question "Send the follow-up to Cedar Books." --lead cedar-books --service slow
//   bun run lab tool-failures --question "Send the follow-up to Atlas Movers." --lead atlas-movers --service down
//   bun run lab tool-failures --question "Send the follow-up to Xylo Music." --lead xylo-music
//   bun run lab tool-failures --question "Send the follow-up to a new lead." --lead unknown-lead
//   bun run lab tool-failures --demo

import { runLab } from "../src/runner";
import { fetchOnce } from "../src/mail-service"; // one real call, with a time limit
import { emailOf } from "../src/team";

export type Limits = { timeoutSeconds: number; tries: number; waitMs: number };
export type Sent = { outcome: string; text: string; attempts: number; log: string[] };

// Send one follow-up the careful way. Read the steps in order.
export function sendFollowUp(url: string, leadId: string, limits: Limits): Sent {
  // Step 1: check the lead first. A lead we do not know never reaches the service.
  const address = emailOf(leadId);
  if (address === "") {
    const log = [`Step 1: no lead named ${leadId}. No call.`];
    return { outcome: "bad-input", text: "No address, so nothing was sent.", attempts: 0, log };
  }
  const log = [`Step 1: the lead ${leadId} has an address.`];
  const link = `${url}/send?to=${encodeURIComponent(address)}`;

  for (let attempt = 1; attempt <= limits.tries; attempt++) {
    // Step 2: call the service, with a time limit.
    const reply = fetchOnce(link, limits.timeoutSeconds);
    log.push(`Step 2: try ${attempt} of ${limits.tries}: ${describe(reply.status)}.`);

    // Step 3: a good reply ends the loop.
    if (reply.status === 200) return { outcome: "sent", text: reply.body, attempts: attempt, log };

    // Step 4: a no is a no. A bounced address will bounce again, so we stop.
    if (isNo(reply.status)) {
      log.push("Step 4: the address bounced, so we do not try again.");
      return { outcome: "bounced", text: reply.body, attempts: attempt, log };
    }

    // Step 5: a 429, a 5xx or no reply may pass. Wait longer each time.
    if (attempt < limits.tries) {
      const wait = limits.waitMs * (1 << (attempt - 1));
      log.push(`Step 5: waiting ${wait} ms before the next try.`);
      Bun.sleepSync(wait);
    }
  }

  // Step 6: out of tries. Keep the lead for later, and say plainly that nothing was sent.
  log.push("Step 6: out of tries. Nothing was sent. The lead stays in the queue.");
  return { outcome: "gave-up", text: "Not sent. Try again later.", attempts: limits.tries, log };
}

// A no is a 4xx, except 429. A 429 means "come back later".
export function isNo(status: number): boolean {
  if (status === 429) return false;
  return status >= 400 && status < 500;
}

// Words for a status. 0 means the service never answered in time.
function describe(status: number): string {
  if (status === 0) return "no reply in time";
  return `status ${status}`;
}

// The naive limits: one try, no wait, and a very long time limit.
export const NAIVE_LIMITS: Limits = { timeoutSeconds: 60, tries: 1, waitMs: 0 };

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/20-tool-failures");
  runLab(lab);
}
