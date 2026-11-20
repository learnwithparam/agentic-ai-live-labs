// Expense Manager data for the error feedback lab. All of it is invented.
// The pretend model writes a filing call, then fixes it from the error text.

import { RECEIPTS, type Receipt } from "./team";

// Two more receipts: a train ticket, and gift cards that fit no category.
export const EXTRA_RECEIPTS: Receipt[] = [
  { id: "receipt-train", text: "Train to the Acme workshop, 64.00 EUR, 2026-05-02", amount: 64, currency: "EUR", date: "2026-05-02" },
  { id: "receipt-gift", text: "Gift cards for the team, 150 USD, 2026-05-06", amount: 150, currency: "USD", date: "2026-05-06" },
];

export const ALL_RECEIPTS: Receipt[] = [...RECEIPTS, ...EXTRA_RECEIPTS];
export const RECEIPT_IDS = ALL_RECEIPTS.map((receipt) => receipt.id);

// What the model first writes for each kind of receipt. The loose words are wrong on purpose.
// A real model makes the same slips. An empty category means no category fits.
const ROWS = [
  { word: "font", id: "receipt-font", loose: "fonts", category: "software" },
  { word: "lunch", id: "receipt-lunch", loose: "lunch", category: "meals" },
  { word: "cloud", id: "receipt-cloud", loose: "cloud", category: "hosting" },
  { word: "train", id: "receipt-trainticket", loose: "travel", category: "travel" },
  { word: "gift", id: "", loose: "", category: "" },
];

// The pretend model. It reads the task, and the last call and error if there is one.
export function expenseCall(prompt: string): string {
  const task = (prompt.split("\nTask: ")[1] || "").split("\n")[0].toLowerCase();
  const row = ROWS.find((one) => task.includes(one.word));
  if (row === undefined || row.category === "") return "ASK";
  const lastCall = prompt.split("\nYour last call: ")[1];
  if (lastCall === undefined) return firstCall(task, row);
  const said = prompt.split("\nThe tool said: ")[1] || "";
  const call = JSON.parse(lastCall.split("\n")[0]);
  if (said.includes("Use one of:")) call.category = row.category;
  if (said.includes("Known receipts:")) call.receipt = realId(row.word);
  return JSON.stringify(call);
}

function firstCall(task: string, row: { id: string; loose: string }): string {
  const named = task.split(" as ")[1];
  const category = named ? named.replace(".", "").trim() : row.loose;
  return JSON.stringify({ receipt: row.id, category });
}

function realId(word: string): string {
  for (const receipt of ALL_RECEIPTS) if (receipt.text.toLowerCase().includes(word)) return receipt.id;
  return "";
}
