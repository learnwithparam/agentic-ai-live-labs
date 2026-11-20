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
test("the doctor's own country wins, even when she asks about another", () => {
  const weber = actForUser(tokenForUser("answer", "dr-weber", 1000), usDose, usWriter(), 1000);
  expect(weber.answer).toContain("CARDIOZA-DE");
  expect(weber.answer).not.toContain("CARDIOZA-US");
  const lee = actForUser(tokenForUser("answer", "dr-lee", 1000), "What is the dose of Cardioza?", makeModel("ok"), 1000);
  expect(lee.answer).toContain("CARDIOZA-US");
  expect(actNaive(usDose, "US", makeModel("ok")).answer).toContain("CARDIOZA-US");
});

test("an unknown doctor, an old token and a bot with no docs.read answer nothing", () => {
  const ask = "What is the dose of Cardioza?";
  expect(actForUser(tokenForUser("answer", "dr-unknown", 1000), ask, makeModel("ok"), 1000).outcome).toBe("denied");
  expect(actForUser(tokenForUser("answer", "dr-lee", 1000), ask, makeModel("ok"), 9000).outcome).toBe("denied");
  expect(actForUser(tokenForUser("report", "dr-lee", 1000), ask, makeModel("ok"), 1000).outcome).toBe("denied");
});

test("a token edited to name another doctor is refused", () => {
  const good = tokenForUser("answer", "dr-weber", 1000);
  const claims = { bot: "answer", scopes: ["docs.read"], expires: 2000, user: "dr-lee" };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const bad = actForUser(`${body}.${good.split(".")[1]}`, "What is the dose of Cardioza?", makeModel("ok"), 1000);
  expect(bad.outcome).toBe("denied");
});
