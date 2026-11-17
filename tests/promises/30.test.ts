import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { updateDoctors, updateNaive } from "../../labs/30-chain-and-delegate";

const model = makeModel("ok");
const job = "Write the Cardioza update for Dr. Lee, Dr. Weber and Dr. Rao.";
const all = ["H-1", "H-2", "H-3"];

// PROMISE: each letter comes from a document of the doctor's own country, and passes a check.
// A worker that fails is held and named, and the others still go.
test("each doctor's letter cites the document of the doctor's country", () => {
  const letters = updateDoctors(job, all, model);
  expect(letters.every((letter) => letter.sent)).toBe(true);
  expect(letters[0].text).toContain("DOC-101");
  expect(letters[1].text).toContain("DOC-102");
  expect(letters[2].text).toContain("DOC-101");
  expect(updateNaive(job, all, model)[1].text).toContain("DOC-101");
});

test("a worker with no document is held and the others still go", () => {
  const letters = updateDoctors("Write the Neurovex update for all three.", all, model);
  expect(letters.map((letter) => letter.sent)).toEqual([true, false, true]);
  expect(letters[1].log[0]).toContain("Dr. Weber");
  expect(letters[1].log[0]).toContain("no approved");
});

test("a letter with a dose that is not in its source is held", () => {
  function wrongDose(messages: any, names: any) {
    if (messages[0].content.startsWith("MAIL:")) return { text: "Dear doctor, take 99mg. [DOC-101]" };
    return model(messages, names);
  }
  const letters = updateDoctors(job, ["H-1"], wrongDose);
  expect(letters[0].sent).toBe(false);
  function noCite(messages: any, names: any) {
    if (messages[0].content.startsWith("MAIL:")) return { text: "Dear doctor, take 10mg daily." };
    return model(messages, names);
  }
  expect(updateDoctors(job, ["H-1"], noCite)[0].sent).toBe(false);
});

test("a letter that cites another country's document is held", () => {
  function other(messages: any, names: any) {
    if (messages[0].content.startsWith("MAIL:")) return { text: "Dear doctor, take 10mg daily. [DOC-102]" };
    return model(messages, names);
  }
  expect(updateDoctors(job, ["H-1"], other)[0].sent).toBe(false);
});
