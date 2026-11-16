import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { LABS, PATHS, TRACKS } from "../src/roadmap";
import { labFile, renderAll } from "../scripts/path";

describe("the roadmap", () => {
  test("lab numbers run 1 to N with no gaps and no repeated names", () => {
    expect(LABS.map((lab) => lab.number)).toEqual(LABS.map((_, index) => index + 1));
    expect(new Set(LABS.map((lab) => lab.slug)).size).toBe(LABS.length);
  });
  test("every lab belongs to a real track, and tracks stay in order", () => {
    const trackIds = TRACKS.map((track) => track.id);
    for (const lab of LABS) expect(trackIds).toContain(lab.track);
    const used = LABS.map((lab) => trackIds.indexOf(lab.track));
    expect(used).toEqual([...used].sort((first, second) => first - second));
  });
  test("every lab file in labs/ is on the roadmap with the same file name", () => {
    const files = readdirSync("labs").filter((name) => /^\d\d-.*\.ts$/.test(name));
    const wanted = LABS.map((lab) => labFile(lab));
    for (const file of files) expect(wanted).toContain(file);
  });
});

describe("the learning paths", () => {
  test("every step names a lab that exists, once, and each table is in teaching order", () => {
    for (const path of PATHS) {
      const numbers = path.steps.map((step) => step.lab);
      expect(new Set(numbers).size).toBe(numbers.length);
      for (const number of numbers) expect(LABS.map((lab) => lab.number)).toContain(number);
      for (const optional of [false, true]) {
        const group = path.steps.filter((step) => Boolean(step.optional) === optional).map((step) => step.lab);
        expect(group).toEqual([...group].sort((first, second) => first - second));
      }
    }
  });
  test("each path has main steps, and a next path that exists", () => {
    const ids = PATHS.map((path) => path.id);
    for (const path of PATHS) {
      expect(path.steps.some((step) => !step.optional)).toBe(true);
      expect(path.next === "add" || ids.includes(path.next)).toBe(true);
    }
  });
  test("the committed markdown matches what the roadmap makes", () => {
    const files = renderAll();
    for (const name in files) expect(readFileSync(name, "utf8")).toBe(files[name]);
  });
  test("the markdown is plain: no em dash, sentences of 25 words or fewer", () => {
    const files = renderAll();
    for (const name in files) {
      expect(files[name]).not.toContain("—");
      for (const line of files[name].split("\n")) {
        if (line.startsWith("|") || line.startsWith("#")) continue;
        for (const sentence of line.split(/[.!?]\s/)) {
          expect(sentence.split(/\s+/).length).toBeLessThanOrEqual(25);
        }
      }
    }
  });
});
