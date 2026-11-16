// A gate stops the run and hands the whole trace to a person.
// In the labs the person types y or n. In tests, and with --approve y or n, the answer is given up front.

export type Ask = (prompt: string) => string | null;

export type Review = { reason: string; question: string; sources: string; draft: string };

export function humanApprovalGate(review: Review, ask: Ask): boolean {
  console.log("\n--- HUMAN REVIEW REQUIRED ---");
  console.log(`Reason for pause : ${review.reason}`);
  console.log(`HCP question     : ${review.question}`);
  console.log(`Approved sources : ${review.sources}`);
  console.log(`Proposed draft   : ${review.draft}`);
  console.log("-----------------------------");
  const answer = ask("Approve sending this response to the HCP? (y/n): ");
  return (answer ?? "n").trim().toLowerCase() === "y";
}
