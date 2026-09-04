import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CLAUDE_BLOCK_END,
  CLAUDE_BLOCK_START,
  MAX_CODEX_BYTES,
  STARTUP_SOURCES,
  applyClaudeImportBlock,
  checkSynchronized,
  renderClaudeImportBlock,
  renderCodexBootstrap,
  synchronize,
} from "./sync-agent-instructions.mjs";

function fixtureSources() {
  return Object.fromEntries(STARTUP_SOURCES.map((source) => [source, `# ${source}\ncontent-${source}\n`]));
}

function makeFixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pyjamada-agent-instructions-"));
  for (const [relativePath, content] of Object.entries(fixtureSources())) {
    const absolutePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }
  fs.writeFileSync(path.join(root, "CLAUDE.md"), "# CLAUDE.md\n\nClaude-specific content.\n");
  return root;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("Codex projection contains every canonical source in fixed order", () => {
  const output = renderCodexBootstrap(fixtureSources());
  let previous = -1;
  for (const source of STARTUP_SOURCES) {
    const position = output.indexOf(`<!-- BEGIN SOURCE: ${source} -->`);
    assert.ok(position > previous, `${source} should appear in source order`);
    assert.match(output, new RegExp(escapeRegExp(`content-${source}`)));
    previous = position;
  }
  assert.ok(Buffer.byteLength(output) < MAX_CODEX_BYTES);
});

test("Claude block imports every startup source", () => {
  const block = renderClaudeImportBlock();
  for (const source of STARTUP_SOURCES) assert.match(block, new RegExp(escapeRegExp(`@${source}`)));
});

test("canonical task card exposes both local-developer reviewer gates", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const template = fs.readFileSync(path.join(root, "docs/workflow/TASK_CARD_TEMPLATE.md"), "utf8");
  assert.match(template, /1st Reviewer — task analysis/);
  assert.match(template, /2nd Reviewer — solution/);
  assert.match(template, /Both\s+reviewers are mandatory when the local developer authors a Low task/);
  assert.match(template, /devstral-small-2:24b-instruct-2512-q4_K_M/);
  assert.match(template, /gemma4:26b-a4b-it-qat/);
  assert.match(template, /gpt-oss:20b/);
  assert.match(template, /num_ctx=131072/);
});

test("Claude block insertion preserves Claude-specific instructions", () => {
  const original = "# CLAUDE.md\n\n## Claude only\n\nKeep this.\n";
  const updated = applyClaudeImportBlock(original);
  assert.match(updated, /## Claude only/);
  assert.match(updated, new RegExp(escapeRegExp(CLAUDE_BLOCK_START)));
  assert.match(updated, new RegExp(escapeRegExp(CLAUDE_BLOCK_END)));
});

test("Claude block replacement is idempotent", () => {
  const first = applyClaudeImportBlock("# CLAUDE.md\n\nBody.\n");
  assert.equal(applyClaudeImportBlock(first), first);
});

test("synchronize writes both bootstraps and check detects no drift", (t) => {
  const root = makeFixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  synchronize(root);
  assert.deepEqual(checkSynchronized(root), []);
  assert.ok(fs.readFileSync(path.join(root, "AGENTS.override.md"), "utf8").includes("content-AGENTS.md"));
  assert.ok(fs.readFileSync(path.join(root, "CLAUDE.md"), "utf8").includes("@docs/workflow/RRI_POLICY.md"));
});

test("check detects canonical-source and Claude-import drift", (t) => {
  const root = makeFixtureRoot();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  synchronize(root);
  fs.appendFileSync(path.join(root, "docs/workflow/RRI_POLICY.md"), "changed\n");
  let violations = checkSynchronized(root);
  assert.ok(violations.some((violation) => violation.includes("AGENTS.override.md is stale")));

  fs.writeFileSync(path.join(root, "CLAUDE.md"), "# CLAUDE.md\n\nimports removed\n");
  violations = checkSynchronized(root);
  assert.ok(violations.some((violation) => violation.includes("CLAUDE.md startup imports")));
});

test("incomplete Claude markers fail closed", () => {
  assert.throws(
    () => applyClaudeImportBlock(`# CLAUDE.md\n${CLAUDE_BLOCK_START}\n@AGENTS.md\n`),
    /incomplete generated startup-import block/,
  );
});
