// What you see on screen for lab 11: the examples and the printing.
// You do not need to read this file to learn the lab. The lesson is in labs/11-history-trimming.ts.

import { modelFrom, type Lab } from "../src/runner";
import { badgeGreen, badgeRed, badgeYellow, box, dim, field, green, print, red, rule, yellow } from "../src/ui";
import { naiveTrim, replyAfterTrim } from "../labs/11-history-trimming";
import type { Turn } from "../labs/11-history-trimming";

function chatter(count: number): Turn[] {
  const turns: Turn[] = [];
  for (let number = 1; number <= count; number++) {
    const text = number % 2 === 1 ? `Doctor: A question about topic ${number}.` : `Agent: An answer about topic ${number - 1}.`;
    turns.push({ text, fact: false });
  }
  return turns;
}

const COUNTRY: Turn = { text: "Doctor: I am Dr. Weber. I work in Germany, so use German labels.", fact: true };
const ALLERGY: Turn = { text: "Doctor: My patient is allergic to penicillin.", fact: true };
const FINAL: Turn = { text: "Doctor: Which dose label should I use?", fact: false };

type Scene = { turns: Turn[]; need: string };

const SCENES: Record<string, Scene> = {
  short: { turns: [COUNTRY, ...chatter(2), FINAL], need: "Germany" },
  long: { turns: [COUNTRY, ...chatter(10), FINAL], need: "Germany" },
  "two-facts": { turns: [COUNTRY, ...chatter(4), ALLERGY, ...chatter(4), FINAL], need: "penicillin" },
  "no-facts": { turns: [...chatter(10), FINAL], need: "" },
  empty: { turns: [], need: "" },
};

const ASK = "What is the dose of Cardioza for me?";

export const lab: Lab = {
  file: "11-history-trimming.ts",
  title: "Lab 11: trimming the chat history",
  about:
    "Each example is a chat between a doctor and the agent, and the last question needs a fact from the start. Pick a chat by name: short, long, two-facts, no-facts or empty. Use --keep 4 to change how many recent turns stay.",
  terms: "history = the earlier turns of a chat. trim = leave out old turns. pinned fact = a turn we keep whatever its age.",
  challenge: "A long chat does not fit. Cutting the oldest turns also cuts early facts, like the doctor's country.",
  promise: "Pinned facts and the most recent turns always survive, in order. Nothing else does.",
  production: "Let the agent save facts with a tool, and write a short summary of the turns left out.",
  cases: [
    { title: "NAIVE: keep only the last turns", why: "The doctor said Germany in the first turn. That turn is old, so it is cut. The agent no longer knows which label to use.", question: ASK, flags: { chat: "long", naive: "true", keep: "4" }, expect: "fact-lost" },
    { title: "A short chat", why: "The chat is shorter than the limit, so nothing is cut.", question: ASK, flags: { chat: "short", keep: "4" }, expect: "nothing-to-trim" },
    { title: "A long chat, fact pinned", why: "The old chatter is cut. The country turn stays, because it is pinned.", question: ASK, flags: { chat: "long", keep: "4" }, expect: "trimmed" },
    { title: "Two pinned facts", why: "Two old facts are pinned, one early and one in the middle. Both stay.", question: ASK, flags: { chat: "two-facts", keep: "3" }, expect: "trimmed" },
    { title: "Facts only", why: "We keep zero recent turns. Only the pinned facts remain. The current question is sent on its own, as in lab 10.", question: ASK, flags: { chat: "long", keep: "0" }, expect: "facts-only" },
    { title: "A chat with no facts", why: "Nothing is pinned, so only the last turns stay. This is safe, because nothing there was needed.", question: ASK, flags: { chat: "no-facts", keep: "4" }, expect: "trimmed" },
    { title: "A limit larger than the chat", why: "We allow 50 recent turns, and the chat has fewer. Nothing is cut.", question: ASK, flags: { chat: "long", keep: "50" }, expect: "nothing-to-trim" },
    { title: "An empty chat", why: "A new chat has no history. There is nothing to trim, and nothing breaks.", question: ASK, flags: { chat: "empty", keep: "4" }, expect: "empty" },
  ],
  play(question, flags) {
    const name = flags.chat || "long";
    const scene = SCENES[name];
    if (!scene) {
      box("ERROR", [red(`No chat "${name}". Try: ${Object.keys(SCENES).join(", ")}`)], red);
      return "error";
    }
    const keep = Number(flags.keep || 4);
    print(field("Question", question));
    print(field("Chat", `${name}, ${scene.turns.length} turns`));
    print(field("Keep", `the last ${keep} turns, and every pinned fact`));
    if (scene.turns.length === 0) {
      box("EMPTY", [dim("A new chat. Nothing to trim.")], dim);
      return "empty";
    }
    if (flags.naive) return showNaive(scene, keep);
    const result = replyAfterTrim(scene.turns, keep, modelFrom(flags));
    const dropped = scene.turns.length - result.kept.length;
    rule("LOG, STEP BY STEP");
    for (const line of result.log) console.log(dim(line));
    console.log();
    rule("WHAT THE MODEL READS");
    showTurns(result.kept);
    if (!hasFact(result.kept, scene.need)) return "fact-lost";
    if (dropped === 0) return "nothing-to-trim";
    if (keep === 0) return "facts-only";
    return "trimmed";
  },
};

function hasFact(turns: Turn[], need: string): boolean {
  for (const turn of turns) {
    if (turn.text.includes(need)) return true;
  }
  return false;
}

function showTurns(turns: Turn[]) {
  for (const turn of turns) {
    const mark = turn.fact ? badgeYellow("PINNED") : "      ";
    console.log(`${mark} ${turn.fact ? turn.text : dim(turn.text)}`);
  }
}

function showNaive(scene: Scene, keep: number): string {
  const seen = naiveTrim(scene.turns, keep);
  rule("WHAT THE MODEL READS");
  showTurns(seen);
  if (hasFact(seen, scene.need)) {
    box(badgeGreen("KEPT"), [green("The fact survived this time.")], green);
    return "fact-kept";
  }
  box(badgeRed("FACT LOST"), [red(`Nothing here says "${scene.need}". The agent will guess.`)], red);
  return "fact-lost";
}
