import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { replyAfterTrim, type Turn } from "../../labs/11-history-trimming";
import { intakeChat } from "../../src/intake";
import { naiveReply } from "../../show/11-history-trimming";

function chat(name: string, last: string): Turn[] {
  return [...(intakeChat(name) || []), { from: "Client", text: last }];
}

// PROMISE: the brief keeps every fact the client gave, and the newest answer wins.
// The prompt holds the brief and only the last messages.
test("for every limit the brief is full and only the last messages stay", () => {
  const turns = chat("long", "Can you send me the quote today?");
  expect(turns.length).toBeGreaterThan(20);
  for (const keep of [0, 1, 4, 10]) {
    const replied = replyAfterTrim(turns, keep, makeModel());
    expect(replied.kept.length).toBe(keep);
    expect(replied.brief.deadline).toBe("Friday");
    expect(replied.reply).toStartWith("Quote ready");
  }
});

test("the newest deadline replaces the old one", () => {
  const replied = replyAfterTrim(chat("changed", "Are we still on?"), 2, makeModel());
  expect(replied.brief.deadline).toBe("Monday");
  expect(replied.reply).toContain("due Monday");
});

test("a fact the client never gave is asked for, and nothing else is", () => {
  const replied = replyAfterTrim(chat("no-budget", "How long?"), 4, makeModel());
  expect(replied.reply).toBe("Still missing: budget.");
  const empty = replyAfterTrim(chat("new", "Hello"), 4, makeModel());
  expect(empty.brief.contact).toBe("");
});

test("the naive trim loses the deadline, and the bot asks again", () => {
  const reply = naiveReply(chat("long", "Can you send me the quote today?"), 8, makeModel());
  expect(reply).toContain("deadline");
  expect(reply).toStartWith("Still missing");
});
