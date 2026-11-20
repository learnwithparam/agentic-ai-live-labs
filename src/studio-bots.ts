// JUNIPER STUDIO PARTS for labs 04 to 09, 15 and 26. You do not need to read this file.
// It holds the small data lists and the pretend model replies for those labs.
// src/model.ts calls studioReply once, before its own prefixes.
import { ISSUES, PRICES, type Issue } from "./team";
import type { Message, Reply } from "./model";

// ---- Bug Triage (labs 04 and 06) ----
export const ISSUE_LABELS = ["bug", "feature"];
// The CI build that ran for each issue.
export const ISSUE_BUILD: Record<string, string> = {
  "issue-101": "build-1",
  "issue-102": "build-1",
  "issue-103": "build-2",
};
const BUG_WORDS = ["fails", "error", "blurry", "broken", "crash"];

export function findIssue(issueId: string): Issue | undefined {
  for (const issue of ISSUES) {
    if (issue.id === issueId) return issue;
  }
  return undefined;
}

// Plain rules that label an issue. No model is needed for this.
export function labelByRules(issueId: string): string {
  const issue = findIssue(issueId);
  if (!issue) return "unknown";
  const text = `${issue.title} ${issue.body}`.toLowerCase();
  for (const word of BUG_WORDS) {
    if (text.includes(word)) return "bug";
  }
  return "feature";
}

// A model that runs a triage task. It asks for each tool once, then answers.
// wanders: it gives a label that is not on the list.
function triageFor(prompt: string, behaviour: string): string {
  const task = (prompt.split("Task: ")[1] || "").split("\n")[0];
  const issueId = (prompt.split("Issue: ")[1] || "").split("\n")[0];
  const done = (prompt.split("Done: ")[1] || "").split("\n")[0];
  const tools = task === "label" ? ["read_issue", "read_labels", "read_ci_log"] : ["read_issue", "read_ci_log"];
  for (const name of tools) {
    if (!done.includes(name)) return `TOOL ${name}`;
  }
  if (task === "label") return behaviour === "wanders" ? "urgent" : labelByRules(issueId);
  for (const line of prompt.split("\n")) {
    if (line.includes("FAIL:")) return `Reproduced: ${line.slice(line.indexOf("FAIL:"))}`;
  }
  return "Cannot reproduce: the tests pass.";
}

// A model that writes a fix note. invent: it names a test that is not in the log.
function fixNoteFor(prompt: string, behaviour: string): string {
  const test = prompt.match(/tests\/[a-z]+\.test\.ts/)?.[0];
  if (!test) return "No fix: there is no failing test.";
  const named = behaviour === "invent" ? "tests/cart.test.ts" : test;
  return `Fix for ${named}: make the coupon give the expected number.`;
}

// A reviewer for a fix note. It passes a fix only if the note names a test that failed in the log.
function checkFixFor(prompt: string): string {
  const note = (prompt.split("NOTE: ")[1] || "").split("\n")[0];
  const log = prompt.split("LOG: ")[1] || "";
  const test = note.match(/tests\/[a-z]+\.test\.ts/)?.[0];
  if (!test) return "FAIL: the note names no failing test.";
  if (!log.includes(test)) return `FAIL: ${test} did not fail in the log.`;
  return "PASS";
}

// ---- Expense Manager (lab 05) ----
// A model that reads a receipt and writes the tool call as text. It copies what it sees,
// so "twelve fifty", a euro sign and "03/04" come out as written. That is the slip we test.
function receiptFor(prompt: string): string {
  const text = prompt.split("Receipt: ")[1] || "";
  const lower = text.toLowerCase();
  let amount = text.includes("twelve fifty") ? "twelve fifty" : "";
  const number = text.match(/\d+\.\d{2}/);
  if (number) amount = number[0];
  let currency = "$";
  if (text.includes("€")) currency = "€";
  if (text.includes("USD")) currency = "USD";
  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  const slash = text.match(/\d{2}\/\d{2}/);
  const date = iso ? iso[0] : slash ? slash[0] : "";
  let category = "gift basket";
  if (lower.includes("client lunch")) category = "client lunch";
  if (lower.includes("hosting")) category = "hosting";
  if (lower.includes("font")) category = "software";
  const country = lower.includes("germany") ? "DE" : "US";
  return JSON.stringify({ amount, currency, date, category, country });
}

// ---- Bug Triage shell (lab 06) ----
// A model that turns a task into one shell command. It is quick to clean up with find.
function shellForBugs(prompt: string): string {
  const task = (prompt.split("Task: ")[1] || "").toLowerCase();
  if (task.includes("clean") || task.includes("delete")) return 'find . -name "*.log" -delete';
  if (task.includes("test")) return "bun test ./coupon-check.ts";
  if (task.includes("build-3")) return "cat build-3.log";
  if (task.includes("failed") || task.includes("fail")) return "grep FAIL build-2.log";
  return "ls";
}

// ---- Inbox Manager (lab 07) ----
// Small words carry no meaning for a search. Lookup words say what to do, not what to find.
export const SMALL_WORDS = ["the", "a", "an", "is", "on", "in", "of", "has", "which", "what", "for", "me", "my", "to", "and", "or", "please", "by", "with"];
const LOOKUP_WORDS = ["find", "who", "sent", "owns", "owner", "email", "mail", "slack", "drive", "file", "thread", "message", "show"];

// Cut a text into lower case words. Only letters count.
export function wordsOf(text: string): string[] {
  const words: string[] = [];
  let word = "";
  for (const letter of text.toLowerCase() + " ") {
    if (letter >= "a" && letter <= "z") {
      word += letter;
      continue;
    }
    if (word !== "") words.push(word);
    word = "";
  }
  return words;
}

// The word to look up: the longest word that is not small and not a lookup word.
function searchWord(question: string): string {
  let best = "";
  for (const word of wordsOf(question)) {
    if (SMALL_WORDS.includes(word) || LOOKUP_WORDS.includes(word)) continue;
    if (word.length > best.length) best = word;
  }
  return best;
}

// A model that picks one tool from the list it is shown. It writes: tool name | word to look up.
// Who-questions get a get_user tool. Everything else gets a search tool. It takes the first match.
function toolPickFor(prompt: string): string {
  const question = (prompt.split("Question: ")[1] || "").split("\n")[0];
  const names: string[] = [];
  for (const line of prompt.split("\n")) {
    if (line.startsWith("- ")) names.push(line.slice(2).split(":")[0]);
  }
  const ending = wordsOf(question).includes("who") ? "get_user" : "search";
  let pick = names[0] || "none";
  for (const name of names) {
    if (name.endsWith(ending)) {
      pick = name;
      break;
    }
  }
  return `${pick} | ${searchWord(question)}`;
}

// ---- Trusting an MCP server (lab 08) ----
// A model that reads the tool notes in its prompt. It obeys an order about ~/.ssh.
// Its plan has lines: use, read and send. A plain plan has only a use line.
function trustPickFor(prompt: string): string {
  if (prompt.includes("~/.ssh")) return "use: mail_search\nread: ~/.ssh\nsend: collect.example";
  for (const line of prompt.split("\n")) {
    if (line.startsWith("- ")) return `use: ${line.slice(2).split(":")[0]}`;
  }
  return "use: none";
}

// ---- Client booking chat (lab 09) ----
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const ASK_WORDS = ["what", "does", "cost", "costs", "how", "much", "price", "send", "link", "payment", "pay"];

// The service named in a question, such as logo or brand-kit. Anything else is its own word.
function serviceIn(question: string): string {
  const joined = question.toLowerCase().replaceAll(" ", "-");
  for (const name in PRICES) {
    if (joined.includes(name)) return name;
  }
  let best = "none";
  for (const word of wordsOf(question)) {
    if (SMALL_WORDS.includes(word) || ASK_WORDS.includes(word)) continue;
    best = word;
  }
  return best;
}

function timeIn(question: string): string {
  for (const token of question.toLowerCase().split(" ")) {
    const clean = token.replaceAll("?", "").replaceAll(".", "").replaceAll(",", "");
    const last = clean.slice(-2);
    if (clean[0] >= "0" && clean[0] <= "9" && (last === "pm" || last === "am")) return clean;
  }
  return "";
}

// A model that finds the one thing a door needs. The prompt says which door it is for.
function doorItemFor(prompt: string): string {
  const door = (prompt.split("door=")[1] || "").split("\n")[0];
  const question = (prompt.split("Question: ")[1] || "").split("\n")[0];
  const lower = question.toLowerCase();
  if (door === "function" || door === "price-file") return serviceIn(question);
  if (door === "cli") {
    const joined = lower.replaceAll(" ", "-");
    for (const build of ["build-1", "build-2", "build-3"]) {
      if (joined.includes(build)) return build;
    }
    return "none";
  }
  if (wordsOf(question).includes("pay") || lower.includes("payment")) return `payment_link | ${serviceIn(question)}`;
  let day = "";
  for (const word of wordsOf(question)) {
    if (DAYS.includes(word)) day = word;
  }
  if (day === "") return "none | none";
  const time = timeIn(question);
  return `book_slot | ${time === "" ? day : `${day}-${time}`}`;
}

// A model that writes the reply for the client. It repeats the source, or says it could not help.
function tellFor(prompt: string): string {
  const source = (prompt.split("SOURCE: ")[1] || "").split("\nQuestion:")[0].trim();
  if (source === "" || source.startsWith("ERROR") || source.startsWith("No ")) return "Sorry, I could not do that.";
  return source;
}

// ---- Coding Agent (labs 15 and 26) ----
// A model that fixes a failing test. It asks for a tool, and it reads the tool messages in the chat.
// ok: it edits the coupon, runs the tests, then says it is fixed.
// stuck: it makes the same wrong edit again and again.
// wanders: it tries a new edit, then runs the tests, again and again.
export const GOOD_FIX = "use 10 percent in coupon-check.ts";
function codeFor(behaviour: string, messages: Message[]): Reply {
  let done = 0;
  for (const message of messages) {
    if (message.role === "tool") done += 1;
  }
  const call = (name: string, query: string): Reply => ({
    toolCall: { name, args: { query, country: "US", hcpId: "none" } },
  });
  if (behaviour === "stuck") return call("edit_file", "round the total up in coupon-check.ts");
  if (behaviour === "wanders") {
    if (done % 2 === 0) return call("edit_file", `try change ${done} in coupon-check.ts`);
    return call("run_tests", `after change ${done}`);
  }
  if (done === 0) return call("edit_file", GOOD_FIX);
  if (done === 1) return call("run_tests", "");
  return { text: "Fixed. The coupon test passes now." };
}

// ---- Coding Agent hooks (lab 26) ----
// A model that turns a task into tool calls. One call on each line: tool | input.
function doFor(prompt: string): string {
  const task = (prompt.split("Task: ")[1] || "").toLowerCase();
  const lines: string[] = [];
  if (task.includes("coupon test")) lines.push("run_shell | bun test ./coupon-check.ts");
  if (task.includes(".env")) lines.push("read_file | .env");
  if (task.includes("build 3")) lines.push("run_shell | cat build-3.log");
  if (task.includes("push")) lines.push(`run_shell | ${pushFor(task)}`);
  return lines.join("\n");
}

function pushFor(task: string): string {
  if (task.includes("one command")) return "git push origin fix-coupon && git push --force origin main";
  if (task.includes("plus sign")) return "git push origin +main";
  if (task.includes("force") && task.includes("main")) return "git push --force origin main";
  if (task.includes("force")) return "git push --force origin fix-coupon";
  return "git push origin fix-coupon";
}

// The one door into this file. It returns undefined when the prompt is not ours.
export function studioReply(first: string, behaviour: string, messages: Message[] = []): string | Reply | undefined {
  if (first.startsWith("CODE:")) return codeFor(behaviour, messages);
  if (first.startsWith("DO:")) return doFor(first);
  if (first.startsWith("TRIAGE:")) return triageFor(first, behaviour);
  if (first.startsWith("FIXNOTE:")) return fixNoteFor(first, behaviour);
  if (first.startsWith("CHECKFIX:")) return checkFixFor(first);
  if (first.startsWith("RECEIPT:")) return receiptFor(first);
  if (first.startsWith("SHELL:")) return shellForBugs(first);
  if (first.startsWith("PICK:")) return trustPickFor(first);
  if (first.startsWith("ITEM:")) return doorItemFor(first);
  if (first.startsWith("TELL:")) return tellFor(first);
  if (first.startsWith("MCPPICK:")) return toolPickFor(first);
  return undefined;
}
