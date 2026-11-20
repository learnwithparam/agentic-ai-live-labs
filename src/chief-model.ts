// PRETEND MODEL parts for the Chief of Staff bot. You do not need to read this file.
// src/model-ops.ts hands the BOARD: and NEXT: prompts here.

const DAYS = ["thursday", "monday", "tuesday", "wednesday", "friday"];

function dayIn(task: string): string {
  const lower = task.toLowerCase();
  for (const day of DAYS) if (lower.includes(day)) return day[0].toUpperCase() + day.slice(1);
  return "Thursday";
}

function oneStep(tool: string, input: string): { tool: string; input: string } {
  return { tool, input };
}

// The whole plan. It is written first, and nothing runs yet.
export function boardPlan(prompt: string): string {
  const task = prompt.split("\nTask: ")[1] || "";
  const steps = [oneStep("docs", "board papers"), oneStep("metrics", "this quarter")];
  steps.push(oneStep("agenda", "board meeting"));
  if (task.toLowerCase().includes("draft the agenda")) return JSON.stringify(steps);
  steps.unshift(oneStep("calendar", dayIn(task)));
  steps.push(oneStep("book_room", "Boardroom 2"));
  return JSON.stringify(steps);
}

// One step at a time. This model sees only the last result, so it books the room twice.
export function nextStep(prompt: string): string {
  const task = prompt.split("\nTask: ")[1] || "";
  const last = (prompt.split("\nLast result: ")[1] || "").trim();
  if (last.includes("(again)")) return "DONE";
  if (last.startsWith("Room booked")) return JSON.stringify(oneStep("docs", "board papers"));
  if (last.startsWith("Collected")) return JSON.stringify(oneStep("metrics", "this quarter"));
  if (last.startsWith("Billed")) return JSON.stringify(oneStep("agenda", "board meeting"));
  if (last.includes("is free") || last.startsWith("Agenda")) {
    return JSON.stringify(oneStep("book_room", "Boardroom 2"));
  }
  return JSON.stringify(oneStep("calendar", dayIn(task)));
}
