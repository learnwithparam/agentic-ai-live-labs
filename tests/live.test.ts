import { expect, test } from "bun:test";
import { buildBody, replyFrom, toChatMessages } from "../src/live";

test("live: tool results go to the model as text, and the key is never in the body", () => {
  const messages = [
    { role: "system" as const, content: "Use ONLY the approved documents." },
    { role: "user" as const, content: "Question: dose?" },
    { role: "tool" as const, name: "search_approved_docs", content: "[DOC-101] 10mg" },
  ];
  const chat = toChatMessages(messages);
  expect(chat.length).toBe(3);
  expect(chat[2].content).toContain("[DOC-101] 10mg");
  const body = buildBody(messages, ["search_approved_docs"], "some/model");
  expect(JSON.stringify(body)).not.toContain("Bearer");
  expect(body.tools).toHaveLength(1);
  expect(buildBody(messages, [], "some/model").tools).toBeUndefined();
});

test("live: a tool call and a text answer both become a reply", () => {
  const args = '{"query":"Cardioza","country":"US"}';
  const call = { choices: [{ message: { tool_calls: [{ function: { name: "search_approved_docs", arguments: args } }] } }] };
  expect(replyFrom(call).toolCall?.args.query).toBe("Cardioza");
  expect(replyFrom({ choices: [{ message: { content: " Hello " } }] }).text).toBe("Hello");
  expect(() => replyFrom({ error: { message: "bad" } })).toThrow("The model call failed");
});
