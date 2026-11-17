// What you see on screen for the tool schema lab: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/05-tool-schemas.ts.

import { NO_DOC } from "../src/data";
import { modelFrom, type Flags, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, bold, box, dim, field, green, highlight } from "../src/ui";
import { print, red, rule, yellow } from "../src/ui";
import { callWithSchema, searchTool, searchWithSchema, writeCall } from "../labs/05-tool-schemas";
import { searchSchema } from "../src/schema";
import { searchApprovedDocs } from "../labs/01-agent-loop";
import type { Called } from "../labs/05-tool-schemas";
import type { Verdict } from "../src/schema";

const ASK = "What is the Cardioza dose in the US?";
const GOOD = '{"drug": "Cardioza", "country": "US", "limit": 2}';

export const lab: Lab = {
  file: "05-tool-schemas.ts",
  title: "Tool schemas and structured output",
  about:
    "Each example asks the same plain question. The model writes a tool call. To test a bad call, pass the text yourself with --call. A schema checks it first. A good call runs. An easy fix is made and noted. A bad call is rejected, and the tool never runs.",
  terms: "schema = the shape of a good call. JSON = text that holds fields. reject = refuse to run.",
  challenge: "A model writes tool calls as text. A small mistake can fail with no error at all.",
  promise: "A call that fails the schema never reaches the tool.",
  production: "Every tool gets a schema. Real systems use a schema library and the model API's own tool format.",
  cases: [
    { title: "NAIVE: trust the text", why: "The country is written in lower case. With no check, the search finds nothing and nobody is told why. It looks like there is no approved document.", question: ASK, flags: { call: '{"drug": "Cardioza", "country": "us"}', naive: "true" }, expect: "silent-miss" },
    { title: "The model writes the call", why: "The model reads a plain question and writes the tool call itself. Then the schema checks it.", question: ASK, expect: "repaired" },
    { title: "A good call", why: "Every field is right. The tool runs.", question: ASK, flags: { call: GOOD }, expect: "ok" },
    { title: "Easy fix: lower case country", why: "The fix is safe, so we make it and write a note. The same call now finds the document.", question: ASK, flags: { call: '{"drug": "Cardioza", "country": "us"}' }, expect: "repaired" },
    { title: "Easy fix: a number written as text", why: "The limit is the text 3. We turn it into the number 3 and note it.", question: ASK, flags: { call: '{"drug": "Cardioza", "country": "DE", "limit": "3"}' }, expect: "repaired" },
    { title: "Extra field the schema does not know", why: "A field called delete_all is dropped and noted. The tool never sees it.", question: ASK, flags: { call: '{"drug": "Cardioza", "country": "US", "delete_all": true}' }, expect: "repaired" },
    { title: "Missing field", why: "No drug, so there is nothing to search. We reject. We do not guess.", question: ASK, flags: { call: '{"country": "US"}' }, expect: "rejected" },
    { title: "A country we do not serve", why: "FR is not in the allowed list. A wrong country could show the wrong label, so we reject.", question: ASK, flags: { call: '{"drug": "Cardioza", "country": "FR"}' }, expect: "rejected" },
    { title: "Number out of range", why: "A limit of 99 is above the top of the range, which is 5.", question: ASK, flags: { call: '{"drug": "Cardioza", "country": "US", "limit": 99}' }, expect: "rejected" },
    { title: "Not JSON at all", why: "The model wrote a sentence. There is no call to run.", question: ASK, flags: { call: "Please search for Cardioza in the US" }, expect: "rejected" },
  ],
  play(question, flags) {
    print(field("Question", question));
    const written = flags.call;
    if (flags.naive) return playNaive(written || naiveText(question, flags));
    if (written !== undefined) return showCheck(written);
    return showSteps(searchWithSchema(question, modelFrom(flags)));
  },
};

// With no --call, the naive run asks the model for the call text, and trusts it.
function naiveText(question: string, flags: Flags): string {
  return writeCall(question, modelFrom(flags));
}

function showSteps(called: Called): string {
  rule("LOG, STEP BY STEP");
  for (const line of called.log) console.log(dim(line));
  console.log();
  return showVerdict(called.verdict, called.result);
}

function showCheck(raw: string): string {
  print(field("Model wrote", dim(raw)));
  const { verdict, result } = callWithSchema(raw, searchSchema, searchTool);
  rule("SCHEMA CHECK");
  return showVerdict(verdict, result);
}

function showVerdict(verdict: Verdict, result: string): string {
  const badge = { ok: badgeGreen("OK"), repaired: badgeYellow("REPAIRED"), rejected: badgeRed("REJECTED") };
  console.log(badge[verdict.status as "ok"]);
  for (const note of verdict.notes) print(field("note", note, verdict.status === "rejected" ? red : yellow));
  if (verdict.status === "rejected") {
    box("TOOL NOT RUN", [red("The call failed the schema. Nothing was searched.")], red);
    return verdict.status;
  }
  print(field("args", JSON.stringify(verdict.args), dim));
  print(field("result", highlight(result), result === NO_DOC ? red : green));
  return verdict.status;
}

export function naiveCall(raw: string): string {
  const parsed = JSON.parse(raw);
  return searchApprovedDocs(parsed.drug, parsed.country);
}

function playNaive(raw: string): string {
  rule("NO CHECK");
  try {
    const result = naiveCall(raw);
    print(field("result", highlight(result), result === NO_DOC ? red : green));
    if (result === NO_DOC) {
      box("SILENT MISS", [yellow("No error. The call looked fine, yet nothing was found."), bold("Why? Look at the country.")], yellow);
      return "silent-miss";
    }
    return "ran";
  } catch {
    box("CRASH", [red("The text was not JSON, so the run crashed.")], red);
    return "crashed";
  }
}
