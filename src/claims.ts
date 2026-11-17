// Small text tools for lab 38. They cut a draft into sentences and read the citation in each one.
// A citation looks like [DOC-101]. A model may put it before or after the full stop.

// Cut a draft into sentences. A citation stays with the sentence it follows.
export function splitSentences(draft: string): string[] {
  let text = draft.replaceAll("Dr. ", "Dr¤ ").replaceAll(". [DOC-", " [DOC-");
  text = text.replace(/\] /g, "]. ");
  const parts = text.split(/(?<=[.?!])\s+/);
  const sentences: string[] = [];
  for (const part of parts) {
    const sentence = part.replaceAll("Dr¤", "Dr.").trim();
    if (sentence !== "") sentences.push(sentence);
  }
  return sentences;
}

// The document id a sentence cites, or an empty text when it cites none.
export function citedId(sentence: string): string {
  const found = sentence.match(/\[(DOC-\d+)\]/);
  return found ? found[1] : "";
}

// The sentence with its citation taken out.
export function withoutCitation(sentence: string): string {
  return sentence.replace(/\s*\[DOC-\d+\]/, "").trim();
}
