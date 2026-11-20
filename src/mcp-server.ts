// A TINY MCP SERVER. You do not need to read this file. The MCP basics lab reads the CLIENT side.
// MCP is JSON messages over standard input and output, one message per line.
// This server knows four methods: initialize, tools/list, tools/call and one notification.
// It answers each line as soon as it arrives, and exits when the input ends.
// One program plays one service. Pick it with the first argument: gmail, slack or drive.
import { INBOX, PRICES } from "./team";

const SERVICE = process.argv[2] || "gmail";
const text = { type: "string" };
const SCHEMA = { type: "object", properties: { text }, required: ["text"] };

// Each service has a tool called search and a tool called get_user. The names collide on purpose.
const TOOLS: Record<string, { name: string; description: string }[]> = {
  gmail: [
    { name: "search", description: "Search email. Find a message by its subject. Returns the mail id and subject." },
    { name: "get_user", description: "Email sender. Who sent a mail. Give a word from the subject. Returns the sender address." },
  ],
  slack: [
    { name: "search", description: "Search Slack. Find a message or thread in a channel by words. Returns the channel and message." },
    { name: "get_user", description: "Slack person. Who is a teammate on Slack. Give a first name. Returns the role and handle." },
  ],
  drive: [
    { name: "search", description: "Search Drive. Find a file or doc by name. Returns the file id and title." },
    { name: "get_user", description: "Drive owner. Who owns a file in Drive. Give a word from the title. Returns the owner." },
  ],
  // The booking app is an outside service. The client booking chat reaches it over MCP.
  booking: [
    { name: "book_slot", description: "Book a call on Maya's calendar. Give a day and a time, like thursday-3pm." },
    { name: "payment_link", description: "Make a payment link for a service. Give the service name." },
  ],
};

const SLACK_MESSAGES = [
  { channel: "#bugs", text: "Checkout is slow after the coupon step." },
  { channel: "#general", text: "Lunch on Friday?" },
];
const SLACK_USERS: Record<string, string> = {
  dana: "Dana Reyes, designer, @dana",
  lee: "Lee Park, developer, @lee",
};
const FILES = [
  { id: "file-brand-guide", title: "Brand guide", owner: "Maya" },
  { id: "file-acme-brief", title: "Acme brief", owner: "Dana Reyes" },
];

type Outcome = { text: string; isError: boolean };

function miss(word: string): Outcome {
  return { text: `No match for ${word}.`, isError: false };
}

function fail(message: string): Outcome {
  return { text: message, isError: true };
}

function gmail(name: string, word: string): Outcome {
  for (const mail of INBOX) {
    if (!mail.subject.toLowerCase().includes(word)) continue;
    if (name === "search") return { text: `${mail.id}: ${mail.subject}`, isError: false };
    return { text: `${mail.from}`, isError: false };
  }
  return name === "search" ? miss(word) : fail(`No mail matches ${word}`);
}

function slack(name: string, word: string): Outcome {
  if (name === "get_user") {
    const person = SLACK_USERS[word];
    return person ? { text: person, isError: false } : fail(`No Slack user called ${word}`);
  }
  for (const message of SLACK_MESSAGES) {
    if (message.text.toLowerCase().includes(word)) return { text: `${message.channel}: ${message.text}`, isError: false };
  }
  return miss(word);
}

function drive(name: string, word: string): Outcome {
  for (const file of FILES) {
    if (!file.title.toLowerCase().includes(word)) continue;
    if (name === "search") return { text: `${file.id}: ${file.title}`, isError: false };
    return { text: `${file.owner}`, isError: false };
  }
  return name === "search" ? miss(word) : fail(`No file matches ${word}`);
}

function booking(name: string, word: string): Outcome {
  if (name === "book_slot") {
    if (!word.includes("-")) return fail("Give a day and a time, like thursday-3pm");
    return { text: `${word} is booked on Maya's calendar. [calendar]`, isError: false };
  }
  if (PRICES[word] === undefined) return fail(`No service called ${word}`);
  return { text: `https://pay.juniper.example/${word} for ${PRICES[word]} USD [payments]`, isError: false };
}

function callTool(name: string, args: Record<string, string>): Outcome | null {
  let known = false;
  for (const tool of TOOLS[SERVICE] || []) {
    if (tool.name === name) known = true;
  }
  if (!known) return null;
  const word = (args.text || "").toLowerCase();
  if (SERVICE === "gmail") return gmail(name, word);
  if (SERVICE === "slack") return slack(name, word);
  if (SERVICE === "booking") return booking(name, word);
  return drive(name, word);
}

function answer(id: number, result: object) {
  return { jsonrpc: "2.0", id, result };
}

function listed() {
  const tools = [];
  for (const tool of TOOLS[SERVICE] || []) tools.push({ ...tool, inputSchema: SCHEMA });
  return tools;
}

function handle(message: { id?: number; method: string; params?: any }) {
  const id = message.id;
  if (id === undefined) return null; // a notification gets no answer
  if (message.method === "initialize") {
    const info = { name: `juniper-${SERVICE}`, version: "1" };
    return answer(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: info });
  }
  if (message.method === "tools/list") return answer(id, { tools: listed() });
  if (message.method === "tools/call") {
    const outcome = callTool(message.params.name, message.params.arguments || {});
    if (outcome === null) {
      return { jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${message.params.name}` } };
    }
    return answer(id, { content: [{ type: "text", text: outcome.text }], isError: outcome.isError });
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${message.method}` } };
}

// Answer each line as soon as it arrives, so a client can keep the server open.
// A real MCP client waits for the answer before it closes the input.
let waiting = "";
for await (const chunk of Bun.stdin.stream()) {
  waiting += new TextDecoder().decode(chunk);
  const lines = waiting.split("\n");
  waiting = lines.pop() || "";
  for (const line of lines) {
    if (line.trim() === "") continue;
    const reply = handle(JSON.parse(line));
    if (reply) console.log(JSON.stringify(reply));
  }
}
