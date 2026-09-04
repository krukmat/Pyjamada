import assert from "node:assert/strict";
import test from "node:test";

import {
  ccToScore,
  countToFileScore,
  evaluateRri,
  LOW_LOCAL_ROLES,
  parseArgs,
  pathFloors,
  resolveBand,
} from "./rri.mjs";

function baseInput(overrides = {}) {
  return {
    C: 0,
    touches: ["docs/workflow/RRI_POLICY.md"],
    D: 0,
    T: 0,
    A: 0,
    K: 0,
    P: 0,
    X: 0,
    ...overrides,
  };
}

test("maps raw complexity and file counts at policy boundaries", () => {
  assert.deepEqual([5, 6, 10, 11, 20, 21, 30, 31, 50, 51].map(ccToScore), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  assert.deepEqual([0, 1, 2, 3, 5, 6, 10, 11, 20, 21].map(countToFileScore), [0, 0, 1, 2, 2, 3, 3, 4, 4, 5]);
});

test("applies the weighted formula deterministically", () => {
  const result = evaluateRri(baseInput({ C: 1, D: 2, T: 3, A: 4, K: 2, P: 1, X: 3 }));
  assert.equal(result.base, 41);
  assert.equal(result.final, 41);
  assert.equal(result.band.label, "High");
});

test("deduplicates planned paths before scoring F", () => {
  const result = evaluateRri(baseInput({ touches: ["docs/a.md", "./docs/a.md", "docs/b.md"] }));
  assert.equal(result.paths.length, 2);
  assert.equal(result.scores.F, 1);
});

test("raises D P and K to the Pyjamada systemic floors", () => {
  const result = evaluateRri(baseInput({ touches: ["src/game/systemic/SystemicRuntime.ts"] }));
  assert.deepEqual({ D: result.scores.D, P: result.scores.P, K: result.scores.K }, { D: 3, P: 4, K: 3 });
});

test("uses the highest floors across multiple paths", () => {
  const result = pathFloors(["src/game/presentation/FxSystem.ts", "src/platform/storage/AsyncStorageGameSaveRepository.ts"]);
  assert.deepEqual(result.floors, { D: 4, P: 4, K: 3 });
});

test("treats the save port as part of the persistence boundary", () => {
  const result = pathFloors(["src/game/ports/GameSavePort.ts"]);
  assert.deepEqual(result.floors, { D: 4, P: 4, K: 3 });
});

test("categorical risk floors replace unbounded penalty stacking", () => {
  const result = evaluateRri(baseInput({ risks: ["persistence_schema", "destructive"] }));
  assert.equal(result.base, 0);
  assert.equal(result.riskFloor, 71);
  assert.equal(result.final, 71);
  assert.equal(result.band.label, "Critical");
});

test("no verification imposes a Complex floor", () => {
  const result = evaluateRri(baseInput({ modifiers: ["no_verification"] }));
  assert.equal(result.modifierTotal, 12);
  assert.equal(result.final, 56);
  assert.equal(result.decomposition.required, true);
});

test("promotes High-band architecture work to the Premium model route", () => {
  const result = evaluateRri(baseInput({ risks: ["architecture_policy"] }));
  assert.equal(result.final, 41);
  assert.equal(result.route.model, "gpt-5.6-sol");
  assert.equal(result.route.reasoning, "high");
});

test("resolves every delegated Low role to its fixed local model", () => {
  const result = evaluateRri(baseInput());
  assert.equal(result.route.model, "devstral-small-2:24b-instruct-2512-q4_K_M");
  assert.deepEqual(result.roles, LOW_LOCAL_ROLES);
  assert.equal(result.roles.firstReviewer.model, "gemma4:26b-a4b-it-qat");
  assert.equal(result.roles.secondReviewer.model, "gpt-oss:20b");
  assert.equal(result.roles.secondReviewer.num_ctx, 131072);
});

test("low-confidence inputs receive a conservative one-point uplift", () => {
  const result = evaluateRri(baseInput({ A: 4, lowConfidence: ["a"] }));
  assert.equal(result.scores.A, 5);
});

test("caps final scores at 100", () => {
  const result = evaluateRri(baseInput({ C: 5, D: 5, T: 5, A: 5, K: 5, P: 5, X: 5, modifiers: ["mixed_change", "no_verification"] }));
  assert.equal(result.final, 100);
  assert.equal(resolveBand(result.final).label, "Extreme");
});

test("parses repeatable CLI options and comma confidence input", () => {
  const parsed = parseArgs(["--touches", "a.ts", "--touches=b.ts", "--C", "1", "--D", "2", "--T", "1", "--A", "0", "--K", "2", "--P", "1", "--X", "2", "--risk", "architecture_policy", "--low-confidence", "A,X", "--json"]);
  assert.deepEqual(parsed.touches, ["a.ts", "b.ts"]);
  assert.deepEqual(parsed.lowConfidence, ["A", "X"]);
  assert.deepEqual(parsed.risks, ["architecture_policy"]);
  assert.equal(parsed.json, true);
});

test("rejects unknown modifiers and invalid scores", () => {
  assert.throws(() => evaluateRri(baseInput({ modifiers: ["mystery"] })), /unknown modifier/);
  assert.throws(() => evaluateRri(baseInput({ P: 6 })), /P must be an integer from 0 to 5/);
});
