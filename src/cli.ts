import { makeModel, type Behaviour } from "./model";
import type { Ask } from "./gate";

// Flags look like --name value. Everything else is ignored.
export function flags(argv = process.argv.slice(2)): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") || argv[i + 1] === undefined ? "true" : argv[++i];
  }
  return out;
}

export const modelFrom = (f: Record<string, string>) => makeModel((f.model as Behaviour) ?? "ok");

// --approve y or n answers every gate. With no flag, a person types the answer.
export function askFrom(f: Record<string, string>): Ask {
  return (text) => {
    if (f.approve) {
      console.log(`${text}${f.approve}`);
      return f.approve;
    }
    return prompt(text);
  };
}

// With --question the lab runs once. Without it, the lab asks again and again until you press Enter on an empty line.
export function eachQuestion(f: Record<string, string>, hint: string, run: (q: string) => void) {
  if (f.question) return run(f.question);
  console.log(hint);
  for (;;) {
    const q = prompt("\nQuestion (empty line to quit): ");
    if (!q?.trim()) return;
    run(q);
  }
}

export const banner = (title: string, about: string) => console.log(`\n=== ${title} ===\n${about}\n`);
