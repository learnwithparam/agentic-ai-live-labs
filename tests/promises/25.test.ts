import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { actForUser, actNaive, tokenForUser } from "../../labs/25-act-for-user";

// PROMISE: the bot does only what its token allows, for the person the token names.
// A send is refused when the token holds no send scope. A bad token does nothing.
test("a draft-only token drafts, and the trick email cannot make it send", () => {
  const token = tokenForUser("inbox", "maya", 1000);
  const draft = actForUser(token, "mail-meeting", makeModel("ok"), 1000);
  expect(draft.outcome).toBe("drafted");
  const tricked = actForUser(token, "mail-vendor", makeModel("ok"), 1000);
  expect(tricked.outcome).toBe("denied");
  expect(tricked.log.join(" ")).toContain("mail.send");
  expect(actNaive("mail-vendor", makeModel("ok")).outcome).toBe("sent-by-trick");
});

test("a stranger, an old token and another bot's key do nothing", () => {
  const ask = "mail-contract";
  expect(actForUser(tokenForUser("inbox", "sam", 1000), ask, makeModel("ok"), 1000).outcome).toBe("denied");
  expect(actForUser(tokenForUser("inbox", "maya", 1000), ask, makeModel("ok"), 9000).outcome).toBe("denied");
  expect(actForUser(tokenForUser("expense", "maya", 1000), ask, makeModel("ok"), 1000).outcome).toBe("denied");
});

test("a token edited to add the send scope is refused", () => {
  const good = tokenForUser("inbox", "maya", 1000);
  const claims = { bot: "inbox", scopes: ["mail.draft", "mail.send"], expires: 2000, user: "maya" };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const bad = actForUser(`${body}.${good.split(".")[1]}`, "mail-vendor", makeModel("ok"), 1000);
  expect(bad.outcome).toBe("denied");
});
