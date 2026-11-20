// Chains and delegation
//
// Juniper Studio has an Expense Manager bot. Each receipt goes through a short chain:
// match it to a bank line, pick a label for the books, and file it.
// One long prompt for all four jobs goes wrong in a quiet way. It grabs the first bank line it sees.
// So a lead hands each receipt to a worker. Each worker runs the chain in a fixed order.
// A receipt that does not match goes to a person. It is never guessed.
// The lead can also be open ended: it plans its own workers. Then our code caps them at three.
// The run prints each step as it happens, with the same number as the step in the code.
// The examples and the screen output are in show/30-chain-and-delegate.ts. You do not need them to learn.
//
// Run it (copy any line):
//   bun run lab chain-and-delegate --question "Please file all the April receipts for Maya" --naive
//   bun run lab chain-and-delegate --question "Please file all the April receipts for Maya"
//   bun run lab chain-and-delegate --question "Please file the font licence receipt for Maya" --receipts receipt-fontshop
//   bun run lab chain-and-delegate --question "Please file the font licence receipt for Maya" --receipts receipt-fontshop --model invent
//   bun run lab chain-and-delegate --question "Plan the filing of all the receipts" --open true --model wanders
//   bun run lab chain-and-delegate --demo

import { CATEGORIES } from "../src/team";
import type { CallLlm } from "../src/model";
import { runLab } from "../src/runner";
import { bankLineFor, receiptById } from "../src/juniper";

export type Filing = {
  receipt: string;
  filed: boolean;
  bank: string;
  category: string;
  log: string[];
};
const MOST_WORKERS = 3;

// The lead hands each receipt to a worker. A fixed lead always runs the same chain.
export function fileReceipts(ids: string[], callLlm: CallLlm, open = false): Filing[] {
  const filings: Filing[] = [];
  for (const id of ids) {
    // Step 1: an open ended lead plans its own workers. We cap them, so a plan cannot run away.
    if (open) {
      const plan = planFor(id, callLlm);
      if (plan.length > MOST_WORKERS) {
        const why = `Step 1: the plan wants ${plan.length} workers. The cap is ${MOST_WORKERS}.`;
        filings.push(held(id, why));
        continue;
      }
    }
    filings.push(worker(id, callLlm));
  }
  return filings;
}

function planFor(id: string, callLlm: CallLlm): string[] {
  const reply = callLlm([{ role: "user", content: `PLAN-TEAM: ${id}` }], []);
  return (reply.text || "").split(", ");
}

// One worker. It sees one receipt, and runs the chain in order.
function worker(id: string, callLlm: CallLlm): Filing {
  const receipt = receiptById(id);
  if (receipt === undefined) return held(id, `${id}: there is no such receipt.`);

  // Step 2: match the receipt to a bank line. No match means a person looks. We never guess.
  const bank = bankLineFor(receipt);
  if (bank === "none") return held(id, `Step 2: no bank line matches ${id}. A person looks.`);

  // Step 3: pick a label. It must be one the books use.
  const reply = callLlm([{ role: "user", content: `CATEGORY: ${receipt.text}` }], []);
  const category = (reply.text || "").trim();
  if (!CATEGORIES.includes(category)) return held(id, `Step 3: "${category}" is not a label.`);

  // Step 4: file it. The receipt, the bank line and the label go on one record.
  const log = [`${id}: matched ${bank}, filed under ${category}.`];
  return { receipt: id, filed: true, bank, category, log };
}

function held(id: string, why: string): Filing {
  return { receipt: id, filed: false, bank: "none", category: "none", log: [why] };
}

// The naive way: one long prompt does every step, and nobody checks it.
export function fileNaive(ids: string[], callLlm: CallLlm): Filing[] {
  const filings: Filing[] = [];
  for (const id of ids) {
    const reply = callLlm([{ role: "user", content: `EXPENSE: file ${id}` }], []);
    const parts = (reply.text || "").replace("FILED: ", "").split(" | ");
    const log = [`${id}: the long prompt said ${parts[0]}, ${parts[1]}.`];
    filings.push({ receipt: id, filed: true, bank: parts[0], category: parts[1], log });
  }
  return filings;
}

// Run the lab from the command line. The examples and the screen output are in the show file.
if (import.meta.main) {
  const { lab } = await import("../show/30-chain-and-delegate");
  runLab(lab);
}
