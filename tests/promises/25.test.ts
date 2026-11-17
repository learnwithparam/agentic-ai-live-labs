import { expect, test } from "bun:test";
import { makeModel, type CallLlm } from "../../src/model";
import { actForUser, actNaive, tokenForUser } from "../../labs/25-act-for-user";

// A model that always writes the US as the country, whatever it was told.
function usWriter(): CallLlm {
  const inner = makeModel("ok");
  return function (messages, names) {
    const reply = inner(messages, names);
    if (reply.toolCall) reply.toolCall.args.country = "US";
    return reply;
  };
}

const usDose = "What is the Cardioza dose in the US?";

// PROMISE: the bot searches only the country of the doctor its token names. A bad token answers nothing.
test("lab 25: the doctor's own country wins, even when she asks about another", () => {
  const weber = actForUser(tokenForUser("answer", "H-2", 1000), usDose, usWriter(), 1000);
  expect(weber.answer).toContain("DOC-102");
  expect(weber.answer).not.toContain("DOC-101");
  const lee = actForUser(tokenForUser("answer", "H-1", 1000), "What is the dose of Cardioza?", makeModel("ok"), 1000);
  expect(lee.answer).toContain("DOC-101");
  expect(actNaive(usDose, "US", makeModel("ok")).answer).toContain("DOC-101");
});

test("lab 25: an unknown doctor, an old token and a bot with no docs.read answer nothing", () => {
  const ask = "What is the dose of Cardioza?";
  expect(actForUser(tokenForUser("answer", "H-9", 1000), ask, makeModel("ok"), 1000).outcome).toBe("denied");
  expect(actForUser(tokenForUser("answer", "H-1", 1000), ask, makeModel("ok"), 9000).outcome).toBe("denied");
  expect(actForUser(tokenForUser("report", "H-1", 1000), ask, makeModel("ok"), 1000).outcome).toBe("denied");
});

test("lab 25: a token edited to name another doctor is refused", () => {
  const good = tokenForUser("answer", "H-2", 1000);
  const claims = { bot: "answer", scopes: ["docs.read"], expires: 2000, user: "H-1" };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const bad = actForUser(`${body}.${good.split(".")[1]}`, "What is the dose of Cardioza?", makeModel("ok"), 1000);
  expect(bad.outcome).toBe("denied");
});
