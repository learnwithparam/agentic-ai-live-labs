// Small terminal toolkit: colour, boxes and wrapping. No packages.
// Colour turns off when output is piped or NO_COLOR is set, so logs and tests stay clean.

const on = (process.stdout.isTTY && !process.env.NO_COLOR) || !!process.env.FORCE_COLOR;
const paint = (code: string) => (s: string) => (on ? `\x1b[${code}m${s}\x1b[0m` : s);

export const bold = paint("1");
export const dim = paint("2");
export const red = paint("31");
export const green = paint("32");
export const yellow = paint("33");
export const blue = paint("34");
export const magenta = paint("35");
export const cyan = paint("36");
export const inverse = (code: string) => (s: string) => (on ? `\x1b[1;30;${code}m ${s} \x1b[0m` : `[${s}]`);
export const badgeGreen = inverse("42");
export const badgeRed = inverse("41");
export const badgeYellow = inverse("43");
export const badgeCyan = inverse("46");
export const badgeBlue = inverse("44");
export const badgeMagenta = inverse("45");

const WIDTH = 78;
const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

export function wrap(text: string, width = WIDTH - 4): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      if (line && strip(line).length + 1 + strip(word).length > width) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  return lines;
}

// A labelled row: the label sits in a fixed column and long values wrap under it.
export function field(label: string, value: string, labelColor: (s: string) => string = dim, width = 11): string[] {
  const rows = wrap(value, WIDTH - 4 - width - 1);
  return rows.map((r, i) => `${i === 0 ? labelColor(label.padEnd(width)) : " ".repeat(width)} ${r}`);
}

export function box(title: string, lines: string[], color: (s: string) => string = cyan): void {
  const inner = WIDTH - 2;
  const head = ` ${title} `;
  console.log(color(`╭─${bold(head)}${"─".repeat(Math.max(0, inner - 1 - strip(head).length))}╮`));
  for (const l of lines) console.log(`${color("│")} ${l}${" ".repeat(Math.max(0, inner - 2 - strip(l).length))} ${color("│")}`);
  console.log(color(`╰${"─".repeat(inner)}╯`));
}

export const rule = (label = "") =>
  console.log(dim(`\n${label ? `── ${label} ` : ""}${"─".repeat(Math.max(0, WIDTH - (label ? label.length + 4 : 0)))}`));

// Colour approved citation ids and redaction tokens inside a sentence.
export function highlight(text: string): string {
  return text
    .replace(/\[DOC-\d+\]/g, (m) => bold(cyan(m)))
    .replace(/\[(?:SSN|EMAIL|PHONE|MRN|DOB|NAME)\]/g, (m) => bold(magenta(m)));
}

// Colour chosen ranges of a string, used to show which part of a note was sensitive.
export function mark(text: string, spans: { start: number; end: number }[], color: (s: string) => string): string {
  let out = "";
  let at = 0;
  for (const s of [...spans].sort((a, b) => a.start - b.start)) {
    if (s.start < at) continue;
    out += text.slice(at, s.start) + color(text.slice(s.start, s.end));
    at = s.end;
  }
  return out + text.slice(at);
}

export const verdict = {
  safe: (text: string) => `${badgeGreen("SAFE")} ${green(text)}`,
  blocked: (text: string) => `${badgeRed("BLOCKED")} ${red(text)}`,
  person: (text: string) => `${badgeYellow("PERSON")} ${yellow(text)}`,
};

// Print many lines at once.
export const print = (lines: string[]) => lines.forEach((l) => console.log(l));
