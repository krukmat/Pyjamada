import assert from "node:assert/strict";
import test from "node:test";

import { buildAuthorPrompt, buildReviewPrompt, parseArgs, parseVerdict, ROLES, runRole } from "./local-agent.mjs";

const CLOSED_PORT_BASE_URL = "http://127.0.0.1:1";

test("author prompt requires an objective and lists allowed paths", () => {
  assert.throws(() => buildAuthorPrompt({}), /requires --objective/);
  const prompt = buildAuthorPrompt({ objective: "fix X", touches: ["a.ts", "b.ts"] });
  assert.match(prompt, /Objective: fix X/);
  assert.match(prompt, /Allowed paths: a\.ts, b\.ts/);
});

test("review prompt requires a diff and embeds invariants/acceptance", () => {
  assert.throws(() => buildReviewPrompt({}), /require --diff/);
  const prompt = buildReviewPrompt({ diff: "+x", invariants: "no cross imports", acceptance: "tests pass" });
  assert.match(prompt, /no cross imports/);
  assert.match(prompt, /tests pass/);
  assert.match(prompt, /```diff\n\+x\n```/);
});

test("parses PASS/REVISE/BLOCKED verdicts and falls back to UNPARSED", () => {
  assert.deepEqual(parseVerdict("PASS: looks fine"), { verdict: "PASS", reason: "looks fine" });
  assert.deepEqual(parseVerdict("BLOCKED: violates boundary"), { verdict: "BLOCKED", reason: "violates boundary" });
  assert.deepEqual(parseVerdict("uh I think it's ok"), { verdict: "UNPARSED", reason: "uh I think it's ok" });
});

test("runRole rejects unknown roles without contacting Ollama", async () => {
  await assert.rejects(() => runRole("nonexistent", {}, { ollamaClient: async () => "x" }), /unknown role/);
});

test("runRole resolves the author role to the pinned devstral model", async () => {
  let seen;
  const result = await runRole(
    "author",
    { objective: "add a test", touches: ["scripts/x.mjs"] },
    { ollamaClient: async (call) => { seen = call; return "--- a/x\n+++ b/x\n"; } },
  );
  assert.equal(seen.model, ROLES.author.model);
  assert.equal(result.patch, "--- a/x\n+++ b/x");
});

test("runRole resolves review roles and parses their verdict", async () => {
  const result = await runRole(
    "second-reviewer",
    { diff: "+y" },
    { ollamaClient: async () => "PASS: acceptable" },
  );
  assert.equal(result.model, ROLES["second-reviewer"].model);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.reason, "acceptable");
});

test("runRole passes num_ctx for the architect role only", async () => {
  let seen;
  await runRole("architect", { diff: "+z" }, { ollamaClient: async (call) => { seen = call; return "PASS: ok"; } });
  assert.equal(seen.model, ROLES.architect.model);
  assert.equal(seen.num_ctx, 131072);

  let seenNoCtx;
  await runRole("first-reviewer", { diff: "+z" }, { ollamaClient: async (call) => { seenNoCtx = call; return "PASS: ok"; } });
  assert.equal(seenNoCtx.num_ctx, undefined);
});

test("runRole surfaces an unavailable Ollama service without a cloud fallback", async () => {
  await assert.rejects(
    () => runRole("author", { objective: "x" }, { ollamaClient: async () => { throw new Error("unavailable: connection refused"); } }),
    /unavailable/,
  );
});

test("the real callOllama fetch path reports unavailable on a refused connection", async () => {
  await assert.rejects(
    () => runRole("author", { objective: "x" }, { baseUrl: CLOSED_PORT_BASE_URL }),
    /unavailable: could not reach Ollama at http:\/\/127\.0\.0\.1:1/,
  );
});

test("parseArgs collects repeatable --touches and role/role-specific fields", () => {
  const parsed = parseArgs(["--role", "author", "--objective", "do X", "--touches", "a.ts", "--touches", "b.ts", "--json"]);
  assert.equal(parsed.role, "author");
  assert.equal(parsed.objective, "do X");
  assert.deepEqual(parsed.touches, ["a.ts", "b.ts"]);
  assert.equal(parsed.json, true);
});

test("parseArgs rejects unknown options", () => {
  assert.throws(() => parseArgs(["--bogus", "x"]), /unknown option/);
});
