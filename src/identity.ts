// A signed token for lab 24. It says which bot is calling, what that bot may do, and until when.
// The signature is an HMAC with a secret only our code knows. Change one letter and it fails.

import { createHmac, timingSafeEqual } from "node:crypto";

// user is set when a bot acts for a doctor. It is the doctor's id from the CRM.
export type Claims = { bot: string; scopes: string[]; expires: number; user?: string };
export type Checked = { ok: boolean; reason: string; claims: Claims };

const NOBODY: Claims = { bot: "nobody", scopes: [], expires: 0 };

// In production the secret lives in a vault and is rotated. Here it comes from the environment.
export function botSecret(): string {
  return process.env.BOT_SECRET || "dev-secret-change-me";
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

// Make a token: the claims as text, a dot, and the signature of that text.
export function issue(claims: Claims, secret: string): string {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

function refuse(reason: string): Checked {
  return { ok: false, reason, claims: NOBODY };
}

// Check a token: the shape, the signature, then the expiry. Only a token that passes all three is read.
export function verify(token: string, secret: string, now: number): Checked {
  const parts = token.split(".");
  if (parts.length !== 2) return refuse("the token is not in the right shape");
  const expected = Buffer.from(sign(parts[0], secret));
  const given = Buffer.from(parts[1]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return refuse("the signature does not match, so the token was changed or made by someone else");
  }
  const claims: Claims = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  if (claims.expires <= now) return refuse("the token has expired");
  return { ok: true, reason: "", claims };
}
