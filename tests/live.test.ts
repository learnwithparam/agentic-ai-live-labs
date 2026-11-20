import { expect, test } from "bun:test";
import { CHUNKS } from "../src/chunks";
import { retrieveByMeaning } from "../src/meaning";
import { retrieve } from "../labs/12-retrieval";
import { buildBody, cleanText, replyFrom, toChatMessages } from "../src/live";

test("live: tool results go to the model as text, and the key is never in the body", () => {
  const messages = [
    { role: "system" as const, content: "Use ONLY the approved documents." },
    { role: "user" as const, content: "Question: dose?" },
    { role: "tool" as const, name: "search_approved_docs", content: "[CARDIOZA-US] 10mg" },
  ];
  const chat = toChatMessages(messages);
  expect(chat.length).toBe(3);
  expect(chat[2].content).toContain("[CARDIOZA-US] 10mg");
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

test("live: odd marks from a real model become plain marks", () => {
  expect(cleanText("**10\u00a0mg** (see \u3010CARDIOZA\u2011US\u3011)")).toBe("10 mg (see [CARDIOZA-US])");
});

// These two tests call a real embedding model. They run only when a key is set.
const realKey = process.env.OPENROUTER_API_KEY ? test : test.skip;

realKey("live: a question with no shared word still finds its chunk by meaning", () => {
  const found = retrieveByMeaning("How much of the heart pill should an adult take?", "US", CHUNKS);
  expect(found.outcome).toBe("found");
  expect(found.hits[0].chunk.id).toBe("C-1");
  expect(retrieve("How much of the heart pill should an adult take?", "US", CHUNKS).outcome).toBe("no-source");
});

realKey("live: a question about nothing we hold finds nothing", () => {
  expect(retrieveByMeaning("What is the weather in Berlin today?", "DE", CHUNKS).outcome).toBe("no-source");
});
