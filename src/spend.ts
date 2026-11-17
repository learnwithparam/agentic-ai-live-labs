// Money for lab 22. Every amount is a whole number of millicents: 1000 millicents is one cent.
// Whole numbers never drift the way decimals do, so a total is always exact.
// The day ledger is one line per charge, forced to disk, so a restart still knows what was spent.

import { mkdirSync } from "node:fs";
import { appendLine, readLines } from "./jobs";

export type Price = { in: number; out: number }; // millicents for every 1000 tokens

export const PRICES: Record<string, Price> = {
  small: { in: 100, out: 500 }, // one dollar and five dollars for every million tokens
  big: { in: 1500, out: 7500 }, // fifteen dollars and seventy five dollars
};

export function costOf(price: Price, tokensIn: number, tokensOut: number): number {
  return Math.ceil((tokensIn * price.in + tokensOut * price.out) / 1000);
}

function spendFile(user: string): string {
  const dir = process.env.SPEND_DIR || ".spend";
  mkdirSync(dir, { recursive: true });
  return `${dir}/${user}.jsonl`;
}

// What this person has spent on this day, in millicents.
export function spentOn(user: string, day: string): number {
  let total = 0;
  for (const line of readLines(spendFile(user))) {
    if (line.day === day) total += line.millicents;
  }
  return total;
}

export function charge(user: string, day: string, millicents: number): void {
  appendLine(spendFile(user), { day, millicents });
}

export function showCents(millicents: number): string {
  return `${(millicents / 1000).toFixed(2)} cents`;
}
