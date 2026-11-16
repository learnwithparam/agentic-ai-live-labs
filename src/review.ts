// The review box a person sees at a gate. Lab 3 uses it.
import { badgeYellow, box, field, highlight, yellow } from "./ui";

export function showReview(reason: string, question: string, draft: string) {
  console.log();
  const lines = [...field("Reason", reason, yellow), ...field("Question", question)];
  box(`${badgeYellow("GATE")} Human review required`, [...lines, ...field("Draft", highlight(draft))], yellow);
}
