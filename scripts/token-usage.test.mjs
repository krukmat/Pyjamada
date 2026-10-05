import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  collectClaudeUsage,
  collectCodexUsage,
  encodeClaudeProjectDir,
  filterEntries,
  formatTokens,
  parseArgs,
  renderMarkdown,
  summarize,
} from "./token-usage.mjs";

const SECRET = "PRIVATE-CONVERSATION-CONTENT";

function jsonl(path, records) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, records.map((record) => (typeof record === "string" ? record : JSON.stringify(record))).join("\n"));
}

function claudeMessage({ id, model = "claude-sonnet-5", cwd, timestamp = "2026-09-01T10:00:00Z", usage }) {
  return {
    type: "assistant",
    cwd,
    timestamp,
    requestId: `req-${id}`,
    message: { id, model, role: "assistant", content: [{ type: "text", text: SECRET }], usage },
  };
}

function usage(input, cacheWrite, cacheRead, output) {
  return { input_tokens: input, cache_creation_input_tokens: cacheWrite, cache_read_input_tokens: cacheRead, output_tokens: output };
}

function codexTotal(input, cached, output, reasoning = 0) {
  return { input_tokens: input, cached_input_tokens: cached, cache_write_input_tokens: 0, output_tokens: output, reasoning_output_tokens: reasoning };
}

function codexCount(total, timestamp = "2026-09-02T10:00:00Z") {
  return { type: "event_msg", timestamp, payload: { type: "token_count", info: { total_token_usage: total } } };
}

function fixture() {
  const base = mkdtempSync(join(tmpdir(), "token-usage-"));
  const root = join(base, "work", "Proj");
  const claudeDir = join(base, "claude");
  const codexDir = join(base, "codex");
  const projects = join(claudeDir, "projects");
  const encoded = encodeClaudeProjectDir(root);

  jsonl(join(projects, encoded, "sess-a.jsonl"), [
    { type: "user", cwd: root, message: { role: "user", content: SECRET } },
    claudeMessage({ id: "m1", cwd: root, usage: usage(1, 100, 1000, 10) }),
    // Streamed content blocks repeat the same message id and usage.
    claudeMessage({ id: "m1", cwd: root, usage: usage(1, 100, 1000, 10) }),
    claudeMessage({ id: "m2", cwd: root, timestamp: "2026-09-03T10:00:00Z", model: "claude-opus-5", usage: usage(2, 0, 500, 20) }),
    claudeMessage({ id: "syn", cwd: root, model: "<synthetic>", usage: usage(0, 0, 0, 0) }),
    '{"type":"assistant","message":{"id":"broken"',
  ]);
  jsonl(join(projects, encoded, "sess-a", "subagents", "agent-x.jsonl"), [
    claudeMessage({ id: "s1", cwd: root, usage: usage(1, 50, 200, 5) }),
  ]);
  // A worktree inside the project root is included; a sibling project sharing the prefix is not.
  jsonl(join(projects, `${encoded}-worktree`, "sess-w.jsonl"), [
    claudeMessage({ id: "w1", cwd: join(root, "worktree"), usage: usage(1, 0, 100, 1) }),
  ]);
  jsonl(join(projects, `${encoded}-other`, "sess-o.jsonl"), [
    claudeMessage({ id: "o1", cwd: `${root}-other`, usage: usage(9, 9, 9, 9) }),
  ]);

  jsonl(join(codexDir, "sessions", "2026", "09", "02", "rollout-a.jsonl"), [
    { type: "session_meta", payload: { id: "codex-a", cwd: root, base_instructions: SECRET } },
    { type: "event_msg", payload: { type: "thread_settings_applied", thread_settings: { model: "gpt-5.6-terra" } } },
    { type: "event_msg", payload: { type: "token_count", info: null } },
    codexCount(codexTotal(1000, 800, 50, 20)),
    // Duplicate cumulative totals produce no additional usage.
    codexCount(codexTotal(1000, 800, 50, 20)),
    { type: "turn_context", payload: { model: "gpt-5.6-sol" } },
    codexCount(codexTotal(3000, 2500, 80, 30), "2026-09-03T10:00:00Z"),
    "not json",
  ]);
  jsonl(join(codexDir, "archived_sessions", "rollout-foreign.jsonl"), [
    { type: "session_meta", payload: { id: "codex-foreign", cwd: join(base, "elsewhere") } },
    codexCount(codexTotal(999, 0, 999)),
  ]);

  return { base, root, claudeDir, codexDir, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}

test("collects Claude usage once per message, including subagents and in-root worktrees", () => {
  const env = fixture();
  try {
    const entries = collectClaudeUsage(env);
    assert.deepEqual(entries.map((entry) => entry.usage.output).sort((a, b) => a - b), [1, 5, 10, 20]);
    const subagent = entries.find((entry) => entry.agent === "agent-x");
    assert.equal(subagent.session, "sess-a");
    assert.ok(!entries.some((entry) => entry.model === "<synthetic>"));
    assert.ok(!entries.some((entry) => entry.session === "sess-o"));
  } finally {
    env.cleanup();
  }
});

test("converts cumulative Codex totals into per-model deltas for this project only", () => {
  const env = fixture();
  try {
    const entries = collectCodexUsage(env);
    assert.equal(entries.length, 2);
    assert.deepEqual(entries[0], {
      source: "codex",
      session: "codex-a",
      agent: null,
      model: "gpt-5.6-terra",
      timestamp: "2026-09-02T10:00:00Z",
      usage: { input: 200, cacheWrite: 0, cacheRead: 800, output: 50, reasoning: 20 },
    });
    assert.equal(entries[1].model, "gpt-5.6-sol");
    assert.deepEqual(entries[1].usage, { input: 300, cacheWrite: 0, cacheRead: 1700, output: 30, reasoning: 10 });
  } finally {
    env.cleanup();
  }
});

test("summarizes totals, sessions, models and days deterministically", () => {
  const env = fixture();
  try {
    const entries = [...collectClaudeUsage(env), ...collectCodexUsage(env)];
    const summary = summarize(entries, { top: 2 });
    assert.equal(summary.totals.requests, 6);
    assert.equal(summary.totals.total, 1111 + 522 + 256 + 102 + 1050 + 2030);
    assert.equal(summary.sessionCount, 3);
    assert.equal(summary.topSessions.length, 2);
    assert.equal(summary.topSessions[0].key, "codex:codex-a");
    assert.equal(summary.topSessions[1].subagents, 1);
    assert.deepEqual(summary.byDay.map((row) => row.key), ["2026-09-01", "2026-09-02", "2026-09-03"]);
  } finally {
    env.cleanup();
  }
});

test("filters by day range, session prefix and source", () => {
  const env = fixture();
  try {
    const entries = [...collectClaudeUsage(env), ...collectCodexUsage(env)];
    assert.equal(filterEntries(entries, { since: "2026-09-03" }).length, 2);
    assert.equal(filterEntries(entries, { until: "2026-09-01" }).length, 3);
    assert.equal(filterEntries(entries, { session: "sess-a" }).length, 3);
    assert.equal(filterEntries(entries, { source: "codex" }).length, 2);
  } finally {
    env.cleanup();
  }
});

test("never renders conversation content", () => {
  const env = fixture();
  try {
    const summary = summarize([...collectClaudeUsage(env), ...collectCodexUsage(env)]);
    assert.ok(!renderMarkdown(summary).includes(SECRET));
    assert.ok(!JSON.stringify(summary).includes(SECRET));
  } finally {
    env.cleanup();
  }
});

test("missing transcript directories produce an empty report", () => {
  const base = mkdtempSync(join(tmpdir(), "token-usage-empty-"));
  try {
    const env = { root: join(base, "Proj"), claudeDir: join(base, "none"), codexDir: join(base, "none") };
    const entries = [...collectClaudeUsage(env), ...collectCodexUsage(env)];
    assert.deepEqual(entries, []);
    assert.match(renderMarkdown(summarize(entries)), /No usage records found\./);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("formats token counts and validates arguments", () => {
  assert.deepEqual([999, 1500, 2_345_678].map(formatTokens), ["999", "1.5k", "2.35M"]);
  assert.deepEqual(parseArgs(["--since=2026-09-01", "--source", "codex", "--top", "3", "--json"]), {
    json: true,
    top: 3,
    since: "2026-09-01",
    source: "codex",
  });
  assert.throws(() => parseArgs(["--since", "09/01/2026"]), /YYYY-MM-DD/);
  assert.throws(() => parseArgs(["--source", "ollama"]), /claude or codex/);
  assert.throws(() => parseArgs(["--top", "0"]), /positive integer/);
  assert.throws(() => parseArgs(["--bogus"]), /unknown option/);
});
