// What you see on screen for the tool schema lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/05-tool-schemas.ts.

import { modelFrom, type Flags, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, bold, box, dim, field, green } from "../src/ui";
import { print, red, rule, yellow } from "../src/ui";
import { bookExpense, bookWithSchema, callWithSchema, checkToolCall, writeCall } from "../labs/05-tool-schemas";
import { expenseSchema } from "../src/schema";
import type { Called } from "../labs/05-tool-schemas";
import type { Args, Verdict } from "../src/schema";

const GOOD = '{"amount": 12.5, "currency": "USD", "date": "2026-04-03", "category": "software", "country": "US"}';
const SIGN_IN: Args = { country: "US" };

function call(changes: string): string {
  const base = JSON.parse(GOOD);
  return JSON.stringify({ ...base, ...JSON.parse(changes) });
}

export const lab: Lab = {
  file: "05-tool-schemas.ts",
  title: "Tool schemas and structured output",
  about:
    "Each example sends a receipt to the expense bot. A schema checks each tool call first. Good calls run, fixable calls are repaired and bad calls are rejected. To test a bad call, pass the text with --call. The country always comes from the sign-in, which is the US here.",
  terms: ["schema", "json", "reject"],
  challenge: "A model writes tool calls as JSON text. Words for numbers can reach the books and break them. So can a euro sign or a date like 03/04. No error shows.",
  promise: "A call that fails the schema never reaches the books. The country comes from the sign-in, never from the chat.",
  production: "Every tool gets a schema, and the sign-in fills in who and where. Real systems use a schema library and the model API's own tool format.",
  cases: [
    { title: "NAIVE: trust the text", why: "The model copies the receipt as written: the words twelve fifty, a dollar sign and 03/04. With no check, the books take all three. A date like 03/04 could be two different days.", question: "Font licence, twelve fifty, paid 03/04", flags: { naive: "true" }, expect: "bad-books" },
    { title: "A receipt that is almost right", why: "The model writes the amount as the text 31.00. We turn it into a number and note it. The books are right.", question: "Cloud hosting 31.00 USD, 2026-04-30", expect: "repaired" },
    { title: "A euro sign and a studio word", why: "The model writes the euro sign and the words client lunch. The euro sign has one safe meaning. The word list says client lunch means meals. Both fixes are noted.", question: "Client lunch with Acme, €48.90 on 2026-04-09", expect: "repaired" },
    { title: "Twelve fifty is not a number", why: "We do not guess what words mean. The amount is rejected, and the books stay as they were.", question: "Font licence, twelve fifty, paid 03/04", expect: "rejected" },
    { title: "A good call", why: "Every field is right. The books take it, and it matches a bank line.", question: "Book the font licence for me.", flags: { call: GOOD }, expect: "ok" },
    { title: "A date that could mean two days", why: "The first number could be the day or the month. A guess could book the cost in the wrong month. We reject it and ask for a full date.", question: "Please book the font receipt from 03/04.", flags: { call: call('{"date": "03/04"}') }, expect: "rejected" },
    { title: "A studio word nobody explained", why: "Gift basket is not in the books and not in the word list. We reject it. Once someone adds the word, it works.", question: "Add the gift basket for Acme.", flags: { call: call('{"category": "gift basket"}') }, expect: "rejected" },
    { title: "The country comes from the sign-in", why: "The chat says Germany, but Maya signed in from the US. The schema ignores the chat and uses the sign-in. A note says so.", question: "I am in Germany today. Book this font licence.", flags: { call: call('{"country": "DE"}') }, expect: "repaired" },
    { title: "A missing field", why: "No date, so the cost has no month. We reject. We do not guess.", question: "Book twelve dollars fifty for fonts.", flags: { call: '{"amount": 12.5, "currency": "USD", "category": "software"}' }, expect: "rejected" },
    { title: "An amount that is too big", why: "A hundred thousand dollars is above the top of the range. A slipped decimal point should not reach the books.", question: "Please book the hosting bill.", flags: { call: call('{"amount": 100000}') }, expect: "rejected" },
    { title: "Not JSON at all", why: "The model wrote a sentence. There is no call to run.", question: "Please book the team lunch receipt.", flags: { call: "Please book the lunch with Acme" }, expect: "rejected" },
  ],
  play(question, flags) {
    print(field("Receipt", question));
    const written = flags.call;
    if (flags.naive) return playNaive(written || writeCall(question, modelFrom(flags)));
    if (written !== undefined) return showCheck(written);
    return showSteps(bookWithSchema(question, modelFrom(flags), SIGN_IN));
  },
};

function showSteps(called: Called): string {
  rule("LOG, STEP BY STEP");
  for (const line of called.log) console.log(dim(line));
  console.log();
  return showVerdict(called.verdict, called.result);
}

function showCheck(raw: string): string {
  print(field("Model wrote", dim(raw)));
  const { verdict, result } = callWithSchema(raw, expenseSchema, bookExpense, SIGN_IN);
  rule("SCHEMA CHECK");
  return showVerdict(verdict, result);
}

function showVerdict(verdict: Verdict, result: string): string {
  const badge = { ok: badgeGreen("OK"), repaired: badgeYellow("REPAIRED"), rejected: badgeRed("REJECTED") };
  console.log(badge[verdict.status as "ok"]);
  for (const note of verdict.notes) print(field("note", note, verdict.status === "rejected" ? red : yellow));
  if (verdict.status === "rejected") {
    box("BOOKS NOT TOUCHED", [red("The call failed the schema. Nothing was booked.")], red);
    return verdict.status;
  }
  print(field("args", JSON.stringify(verdict.args), dim));
  print(field("result", result, green));
  return verdict.status;
}

// The naive way: book whatever the model wrote. Numbers are taken as they come.
export function naiveBook(raw: string): string {
  const parsed = JSON.parse(raw);
  return bookExpense({ ...parsed, amount: Number(parsed.amount) });
}

function playNaive(raw: string): string {
  rule("NO CHECK");
  print(field("Model wrote", dim(raw)));
  try {
    const result = naiveBook(raw);
    print(field("result", result, yellow));
    if (checkToolCall(raw, expenseSchema, SIGN_IN).status === "ok") return "ran";
    box("BAD BOOKS", [yellow("No error. The books now hold a wrong amount, currency or date."), bold("Look at the amount and the date.")], yellow);
    return "bad-books";
  } catch {
    box("CRASH", [red("The text was not JSON, so the run crashed.")], red);
    return "crashed";
  }
}
