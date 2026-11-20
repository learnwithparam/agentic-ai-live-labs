// Small text tools for the claim checker lab. They cut a draft into sentences and read the citation in each one.
// A citation looks like [CARDIOZA-US]. A model may put it before or after the full stop.

// Cut a draft into sentences. A citation stays with the sentence it follows.
export function splitSentences(draft: string): string[] {
  let text = draft.replaceAll("Dr. ", "Dr¤ ").replace(/\. (\[[A-Z]+-[A-Z]+\])/g, " $1");
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
  const found = sentence.match(/\[([A-Z]+-[A-Z]+)\]/);
  return found ? found[1] : "";
}

// The sentence with its citation taken out.
export function withoutCitation(sentence: string): string {
  return sentence.replace(/\s*\[[A-Z]+-[A-Z]+\]/, "").trim();
}

// The ids of the documents a text cites, in order. One id looks like CARDIOZA-US.
export function idsIn(text: string): string[] {
  const ids: string[] = [];
  for (const hit of text.matchAll(/\[([A-Z]+-[A-Z]+)\]/g)) ids.push(hit[1]);
  return ids;
}

// The drug a question names, in lower case, or an empty text when it names none.
export function drugNamed(question: string, drugs: string[]): string {
  for (const drug of drugs) if (question.toLowerCase().includes(drug.toLowerCase())) return drug.toLowerCase();
  return "";
}

// A step that runs between two steps of a lab. Tests and examples use it to make a late change.
export type Hook = () => void;
