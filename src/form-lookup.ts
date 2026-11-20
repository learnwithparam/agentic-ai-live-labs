// Reads the form the model filled, and finds the newest label. Used by the reflect and fix lab.
import { LABELS, type Label } from "./data";

export type Form = { drug: string; age: string };

export function readForm(said: string): Form {
  const form: Form = { drug: "none", age: "unknown" };
  for (const part of said.split(" ")) {
    if (part.startsWith("drug=")) form.drug = part.slice(5);
    if (part.startsWith("age=")) form.age = part.slice(4);
  }
  return form;
}

export function newestLabel(drug: string, country: string): Label | undefined {
  let best: Label | undefined;
  for (const label of LABELS) {
    const mine = label.id === `${drug.toUpperCase()}-${country}`;
    if (mine && (best === undefined || label.version > best.version)) best = label;
  }
  return best;
}
