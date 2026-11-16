import { expect, test } from "bun:test";
import { searchApprovedDocs } from "../../labs/01-agent-loop";
import { checkDraft, MOST_ROUNDS, reflectAndFix, SCENES, selfApprove } from "../../labs/18-reflect-and-fix";

const source = searchApprovedDocs("Cardioza", "US");

function run(name: string) {
  const scene = SCENES[name];
  const found = searchApprovedDocs(scene.drug, scene.country);
  return reflectAndFix(scene.first, found, scene.revise);
}

// PROMISE: code checks every draft against the source. A fix gets two rounds at most.
// With no source there is nothing to check.
test("lab 18: the check finds a wrong dose and a missing citation", () => {
  expect(checkDraft("Take 10mg once daily. [DOC-101]", source)).toEqual([]);
  expect(checkDraft("Take 20mg once daily. [DOC-101]", source)).toEqual(["dose 20mg is not in the source"]);
  expect(checkDraft("Take 10mg once daily.", source)).toEqual(["no citation"]);
  expect(selfApprove(SCENES["wrong-dose"].first).outcome).toBe("self-approved");
});

test("lab 18: fixes pass the check, and a model that will not change is stopped", () => {
  expect(run("good")).toMatchObject({ outcome: "accepted", rounds: 0 });
  expect(run("wrong-dose")).toMatchObject({ outcome: "fixed", rounds: 1 });
  expect(run("two-problems")).toMatchObject({ outcome: "fixed", rounds: 1 });
  expect(run("stubborn")).toMatchObject({ outcome: "gave-up", rounds: MOST_ROUNDS });
  expect(run("no-source").outcome).toBe("no-source");
});
