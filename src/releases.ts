// Three versions of the document search, for the evals and release lab. Each is a real change to the code.
// The current one uses the doctor's country. The others are changes that look fine and are not.

import { NO_DOC } from "./data";
import { searchApprovedDocs } from "../labs/01-agent-loop";
import type { Tool } from "../labs/01-agent-loop";

export const VERSIONS = ["current", "wide", "invents"];

export function toolFor(version: string, country: string): Tool {
  return {
    name: "search_approved_docs",
    run(input) {
      // "wide" searches the US documents for everyone. It is easier to keep.
      if (version === "wide") return searchApprovedDocs(input.query, "US");
      const found = searchApprovedDocs(input.query, country);
      // "invents" makes up a document when it finds none.
      if (version === "invents" && found === NO_DOC) return "[FAKE-LABEL] The standard adult dose is 20mg.";
      return found;
    },
  };
}
