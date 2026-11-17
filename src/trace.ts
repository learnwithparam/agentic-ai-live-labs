// A fingerprint of some text, for the chain in the traces and audit lab. The same text always gives the same one.

import { createHash } from "node:crypto";

export function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
