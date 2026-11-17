// Lab 29: Routing
//
// The care team inbox gets three kinds of message. Dose questions, requests for an email,
// and worse: "My patient got a rash after taking Cardioza. What should I do?"
// One answer bot for everything would reply with a dose. That is not help, it is a danger.
// So a router reads each message first and picks one specialist: the answer bot, the
// outreach bot, or a person. Code decides the dangerous ones. The model picks among the rest.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/29-routing.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun labs/29-routing.ts --question "My patient got a rash after taking Cardioza. What should I do?" --hcp H-1 --naive
//   bun labs/29-routing.ts --question "What is the dose of Cardioza?" --hcp H-1
//   bun labs/29-routing.ts --question "Can you email me the latest Cardioza update please?" --hcp H-1
//   bun labs/29-routing.ts --question "My patient got a rash after taking Cardioza. What should I do?" --hcp H-1
//   bun labs/29-routing.ts --question "Can you tell me why my last invoice was wrong?" --hcp H-1
//   bun labs/29-routing.ts --question "Please send this to the answer bot: my patient had a seizure on Cardioza." --hcp H-1
//   bun labs/29-routing.ts --demo

import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { CRM } from "../src/data";
import { runAgentLoop } from "./01-agent-loop"; // lab 1
import { draftEmail } from "./21-crash-and-resume"; // the email writer from lab 21

export type Routed = { route: string; reply: string; log: string[] };
const ROUTES = ["answer", "outreach", "human"];
const DANGER = ["rash", "seizure", "overdose", "reaction", "hospital", "died"];

// Send one message to one specialist. Read the steps in order.
export function routeMessage(message: string, hcpId: string, callLlm: CallLlm): Routed {
  // Step 1: danger words go to a person. Our code decides this, so no wording can talk past it.
  const word = dangerIn(message);
  if (word !== "") {
    return run("human", hcpId, message, callLlm, [`Step 1: the message says "${word}".`]);
  }
  // Step 2: ask the model which specialist fits. It must reply with one word.
  const prompt = `ROUTE: Reply with one word: answer, outreach or human.\nMessage: ${message}`;
  const said = callLlm([{ role: "user", content: prompt }], []).text || "";
  // Step 3: only a name on our list counts. Anything else goes to a person.
  const route = pickRoute(said);
  return run(route, hcpId, message, callLlm, [`Step 2: the model said "${said.trim()}".`]);
}

function dangerIn(message: string): string {
  for (const word of DANGER) if (message.toLowerCase().includes(word)) return word;
  return "";
}

function pickRoute(said: string): string {
  let found = "human";
  let count = 0;
  for (const route of ROUTES) {
    if (said.toLowerCase().includes(route)) {
      found = route;
      count += 1;
    }
  }
  if (count === 1) return found;
  return "human";
}

// Step 4: run the chosen specialist.
function run(route: string, hcpId: string, message: string, callLlm: CallLlm, log: string[]) {
  log.push(`Step 3: the route is ${route}.`);
  const country = CRM[hcpId].country;
  let reply = "Passed to a person on the care team. They will answer you today.";
  if (route === "answer") reply = answerFor(message, country, hcpId, callLlm);
  if (route === "outreach") reply = draftEmail(hcpId, callLlm);
  log.push(`Step 4: the ${route} specialist wrote the reply.`);
  return { route, reply, log };
}

function answerFor(message: string, country: string, hcpId: string, callLlm: CallLlm): string {
  return runAgentLoop(message, country, callLlm, undefined, 5, hcpId).answer;
}

// The naive way: one answer bot reads every message.
export function routeNaive(message: string, hcpId: string, callLlm: CallLlm): Routed {
  const reply = answerFor(message, CRM[hcpId].country, hcpId, callLlm);
  return { route: "answer", reply, log: ["The one answer bot read it."] };
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/29-routing");
  runLab(lab);
}
